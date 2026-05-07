// POST /api/teacher/feedback/draft { submissionId }
// Draft AI feedback the teacher edits before sending. Does NOT save the draft.

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftFeedback } from "@/lib/ai/feedback";

const Schema = z.object({ submissionId: z.string().min(1) });

export async function POST(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (viewer.kind === "demo") {
      throw new AuthError(
        403,
        "Demo mode has no submissions to draft feedback for."
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) throw new AuthError(403, "No teacher profile");

    const sub = await prisma.submission.findUnique({
      where: { id: parsed.data.submissionId },
      include: {
        student: { include: { user: true } },
        unit: { include: { classroom: true, assignment: true } }
      }
    });
    if (!sub || sub.unit.classroom.teacherId !== teacher.id) {
      throw new AuthError(404, "Submission not found");
    }
    if (!sub.unit.assignment) {
      throw new AuthError(400, "Unit has no assignment");
    }

    const studentName = sub.student.user.name ?? sub.student.user.email;
    const studentFirstName = studentName.split(/\s+/)[0] ?? studentName;

    const result = await draftFeedback({
      rubricJson: sub.unit.assignment.rubricJson,
      assignmentBody: sub.unit.assignment.bodyHtml,
      submissionBody: sub.bodyText,
      studentFirstName
    });

    return NextResponse.json({ data: result.data, offline: result.offline });
  } catch (err) {
    return authErrorResponse(err);
  }
}
