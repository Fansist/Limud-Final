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
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { assignment: true }
    });
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

    // Auto-grade against the SAME Assignment.answerKey for every
    // student in the class — this is the uniform-assessment side, the
    // bar everyone is measured against. When no answer key exists,
    // scoreAuto stays null and the teacher grades manually.
    let scoreAuto: number | null = null;
    if (action === "submit" && unit.assignment?.answerKey) {
      scoreAuto = autoGrade({
        bodyText,
        answerKey: unit.assignment.answerKey,
        pointsTotal: unit.assignment.pointsTotal
      });
    }

    const sub = await prisma.submission.upsert({
      where: {
        unitId_studentId: { unitId: unit.id, studentId: student.id }
      },
      update: {
        bodyText,
        status,
        submittedAt: submittedAt ?? undefined,
        scoreAuto: scoreAuto ?? undefined
      },
      create: {
        unitId: unit.id,
        studentId: student.id,
        bodyText,
        status,
        submittedAt: submittedAt ?? undefined,
        scoreAuto
      }
    });
    return NextResponse.json({ ok: true, id: sub.id, scoreAuto });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// Minimal v0.1 auto-grader. The answer key is JSON of one of two shapes:
//   { keywords: string[], passing: number } — case-insensitive substring
//                                              hits on the student body
//   { answers: Array<{ id: string, expected: string, weight?: number }> }
//                                            — per-question regex/string match
// Both yield a 0..pointsTotal integer score the teacher can override.
// We deliberately keep this simple: the brief makes the teacher the
// authority, and uniform auto-grading is a hint, not a verdict.
function autoGrade(args: {
  bodyText: string;
  answerKey: string;
  pointsTotal: number;
}): number | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.answerKey);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const lowered = args.bodyText.toLowerCase();

  if ("keywords" in parsed && Array.isArray((parsed as { keywords: unknown }).keywords)) {
    const k = (parsed as { keywords: unknown[] }).keywords.filter(
      (s): s is string => typeof s === "string"
    );
    if (k.length === 0) return null;
    const hits = k.reduce(
      (n, kw) => (lowered.includes(kw.toLowerCase()) ? n + 1 : n),
      0
    );
    return Math.round((hits / k.length) * args.pointsTotal);
  }

  if ("answers" in parsed && Array.isArray((parsed as { answers: unknown }).answers)) {
    const items = (parsed as { answers: unknown[] }).answers.filter(
      (a): a is { expected: string; weight?: number } =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as { expected?: unknown }).expected === "string"
    );
    if (items.length === 0) return null;
    const totalWeight = items.reduce((n, a) => n + (a.weight ?? 1), 0);
    const earned = items.reduce((n, a) => {
      const w = a.weight ?? 1;
      return lowered.includes(a.expected.toLowerCase()) ? n + w : n;
    }, 0);
    return Math.round((earned / totalWeight) * args.pointsTotal);
  }

  return null;
}
