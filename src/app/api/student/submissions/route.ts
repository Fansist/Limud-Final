// POST /api/student/submissions
// Body: { unitId: string, bodyText: string, action: "draft" | "submit" }
// Demo mode: no DB write, returns { ok: true, id: "demo-submission-1" }.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthError,
  authErrorResponse,
  requireRole
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SubmissionSchema = z.object({
  unitId: z.string().min(1).max(64),
  bodyText: z.string().max(50_000),
  action: z.enum(["draft", "submit"])
});

export async function POST(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("STUDENT");
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = SubmissionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { unitId, bodyText, action } = parsed.data;

    if (viewer.kind === "demo") {
      return NextResponse.json({ ok: true, id: "demo-submission-1" });
    }

    const student = await prisma.student.findUnique({
      where: { userId: viewer.userId }
    });
    if (!student) throw new AuthError(404, "Student record not found");
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new AuthError(404, "Unit not found");
    // Confirm enrollment in this unit's classroom.
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: unit.classroomId,
          studentId: student.id
        }
      }
    });
    if (!enrollment) throw new AuthError(403, "Not enrolled in this classroom");

    const status = action === "submit" ? "SUBMITTED" : "DRAFT";
    const submittedAt = action === "submit" ? new Date() : null;

    const sub = await prisma.submission.upsert({
      where: {
        unitId_studentId: { unitId: unit.id, studentId: student.id }
      },
      update: {
        bodyText,
        status,
        submittedAt: submittedAt ?? undefined
      },
      create: {
        unitId: unit.id,
        studentId: student.id,
        bodyText,
        status,
        submittedAt: submittedAt ?? undefined
      }
    });
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
