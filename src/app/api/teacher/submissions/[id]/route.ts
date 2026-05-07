// PUT /api/teacher/submissions/[id] { scoreFinal, feedbackFinal }
// Validate ownership, write final score + feedback, set RETURNED, audit.

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const Schema = z.object({
  scoreFinal: z.number().int().min(0).max(10000),
  feedbackFinal: z.string().min(1).max(10000)
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (viewer.kind === "demo") {
      throw new AuthError(403, "Demo mode cannot grade submissions.");
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) throw new AuthError(403, "No teacher profile");

    const sub = await prisma.submission.findUnique({
      where: { id: params.id },
      include: { unit: { include: { classroom: true, assignment: true } } }
    });
    if (!sub || sub.unit.classroom.teacherId !== teacher.id) {
      throw new AuthError(404, "Submission not found");
    }
    const points = sub.unit.assignment?.pointsTotal ?? 100;
    if (parsed.data.scoreFinal > points) {
      return NextResponse.json(
        { error: `Score must be ≤ ${points}` },
        { status: 400 }
      );
    }

    await prisma.submission.update({
      where: { id: sub.id },
      data: {
        scoreFinal: parsed.data.scoreFinal,
        feedbackFinal: parsed.data.feedbackFinal,
        status: "RETURNED"
      }
    });

    await audit({
      viewer,
      event: "SUBMISSION_GRADED",
      subjectId: sub.id,
      payload: {
        unitId: sub.unitId,
        studentId: sub.studentId,
        scoreFinal: parsed.data.scoreFinal
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
