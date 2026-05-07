// POST /api/student/tutor
// Body: { mode: "SOCRATIC" | "DIRECT", transcript: TutorMessage[], unitId?: string }
// Returns { data, offline }

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthError,
  authErrorResponse,
  requireRole
} from "@/lib/auth";
import { tutorReply } from "@/lib/ai/tutor";
import { audit } from "@/lib/audit";
import { findDemoUnit } from "@/lib/demo/data";
import { prisma } from "@/lib/prisma";
import type { TutorMessage } from "@/lib/types";

const TutorMessageSchema = z.object({
  role: z.enum(["student", "tutor"]),
  content: z.string().max(10_000),
  ts: z.string().max(64)
});

const TutorBodySchema = z.object({
  mode: z.enum(["SOCRATIC", "DIRECT"]).optional(),
  transcript: z.array(TutorMessageSchema).max(200).optional(),
  unitId: z.string().min(1).max(64).optional()
});

export async function POST(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("STUDENT");
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = TutorBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const transcript: TutorMessage[] = parsed.data.transcript ?? [];
    const mode: "SOCRATIC" | "DIRECT" = parsed.data.mode ?? "SOCRATIC";
    const unitId = parsed.data.unitId;

    // First message of a session: leave a TUTOR_SESSION_OPENED trace
    // for the audit trail. The audit helper no-ops in demo mode so we
    // don't pollute the real log with synthetic activity.
    if (transcript.length <= 1) {
      await audit({
        viewer,
        event: "TUTOR_SESSION_OPENED",
        subjectId: unitId,
        payload: { mode }
      });
    }

    // Build optional unit context for grounding the tutor.
    let unitContext: string | undefined;
    if (unitId) {
      if (viewer.kind === "demo") {
        const u = findDemoUnit(unitId);
        if (u) {
          unitContext = `${u.title}: ${u.description}\n\nObjectives:\n- ${u.material.objectives.join("\n- ")}`;
        }
      } else {
        // Resolve the student row for this real viewer so we can
        // verify enrollment in the unit's classroom before exposing
        // any unit content (title/description/objectives) to the
        // tutor prompt.
        const student = await prisma.student.findUnique({
          where: { userId: viewer.userId },
          select: { id: true }
        });
        if (!student) throw new AuthError(403, "Student record missing");
        const unit = await prisma.unit.findUnique({
          where: { id: unitId },
          include: { material: true }
        });
        if (!unit) throw new AuthError(404, "Unit not found");
        const enrolled = await prisma.enrollment.findUnique({
          where: {
            classroomId_studentId: {
              classroomId: unit.classroomId,
              studentId: student.id
            }
          },
          select: { id: true }
        });
        if (!enrolled) throw new AuthError(403, "Not enrolled in this unit");
        let objectives: string[] = [];
        if (unit.material) {
          try {
            const parsed = JSON.parse(unit.material.objectives) as unknown;
            if (Array.isArray(parsed)) {
              objectives = parsed.filter((s): s is string => typeof s === "string");
            }
          } catch {
            objectives = [];
          }
        }
        unitContext = `${unit.title}: ${unit.description ?? ""}\n\nObjectives:\n- ${objectives.join("\n- ")}`;
      }
    }

    const result = await tutorReply({ mode, transcript, unitContext });
    return NextResponse.json({ data: result.data, offline: result.offline });
  } catch (err) {
    return authErrorResponse(err);
  }
}
