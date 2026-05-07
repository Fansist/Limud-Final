// POST /api/student/tutor
// Body: { mode: "SOCRATIC" | "DIRECT", transcript: TutorMessage[], unitId?: string }
// Returns { data, offline }

import { NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  requireRole
} from "@/lib/auth";
import { tutorReply } from "@/lib/ai/tutor";
import { findDemoUnit } from "@/lib/demo/data";
import { prisma } from "@/lib/prisma";
import type { TutorMessage } from "@/lib/types";

type Body = {
  mode?: unknown;
  transcript?: unknown;
  unitId?: unknown;
};

function isTutorMessage(x: unknown): x is TutorMessage {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    (o.role === "student" || o.role === "tutor") &&
    typeof o.content === "string" &&
    typeof o.ts === "string"
  );
}

function normalizeMode(m: unknown): "SOCRATIC" | "DIRECT" {
  return m === "DIRECT" ? "DIRECT" : "SOCRATIC";
}

export async function POST(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("STUDENT");
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) throw new AuthError(400, "Invalid JSON");
    const transcriptRaw = Array.isArray(body.transcript) ? body.transcript : [];
    const transcript: TutorMessage[] = transcriptRaw.filter(isTutorMessage);
    const mode = normalizeMode(body.mode);
    const unitId = typeof body.unitId === "string" ? body.unitId : undefined;

    // Build optional unit context for grounding the tutor.
    let unitContext: string | undefined;
    if (unitId) {
      if (viewer.kind === "demo") {
        const u = findDemoUnit(unitId);
        if (u) {
          unitContext = `${u.title}: ${u.description}\n\nObjectives:\n- ${u.material.objectives.join("\n- ")}`;
        }
      } else {
        const unit = await prisma.unit.findUnique({
          where: { id: unitId },
          include: { material: true }
        });
        if (unit) {
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
    }

    const result = await tutorReply({ mode, transcript, unitContext });
    return NextResponse.json({ data: result.data, offline: result.offline });
  } catch (err) {
    return authErrorResponse(err);
  }
}
