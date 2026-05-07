// POST /api/self/units
// Creates a Unit + Assignment + Material in the SELF_ED user's
// district-of-one classroom. Same body shape as /api/teacher/units —
// the contract is the spine, regardless of role. Demo mode short-
// circuits with a friendly message.

import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireRole, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const BodySchema = z.object({
  // classroomId is accepted for parity with the teacher route but is
  // optional — the SELF_ED user owns exactly one classroom.
  classroomId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assignment: z.object({
    bodyHtml: z.string().min(1),
    rubricJson: z.string().min(2),
    pointsTotal: z.number().int().min(1).max(10_000).default(100)
  }),
  material: z.object({
    sourceHtml: z.string().min(1),
    sourceLexile: z.number().int().min(0).max(2000).default(0),
    objectives: z.array(z.string().min(1)).min(1).max(20)
  })
});

export async function POST(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("SELF_ED");

    if (viewer.kind === "demo") {
      return NextResponse.json({
        ok: true,
        demo: true,
        message:
          "Demo mode: in production this would create the unit inside your district of one."
      });
    }

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Validate the rubric is JSON-parseable (the field stores JSON text
    // verbatim, but a typo here would surface much later).
    try {
      JSON.parse(body.assignment.rubricJson);
    } catch {
      return NextResponse.json(
        { error: "rubricJson must be valid JSON" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId },
      include: {
        district: true,
        classrooms: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!teacher) {
      throw new AuthError(403, "Self-ed teacher record missing");
    }
    if (!teacher.district.isSelfEd) {
      throw new AuthError(403, "Not a self-ed district");
    }

    // Resolve the classroom: explicit param wins (must belong to this
    // teacher), otherwise the only / oldest classroom.
    let classroomId: string | null = null;
    if (body.classroomId) {
      const c = teacher.classrooms.find((x) => x.id === body.classroomId);
      if (!c) {
        return NextResponse.json(
          { error: "Classroom not found in your district" },
          { status: 404 }
        );
      }
      classroomId = c.id;
    } else {
      classroomId = teacher.classrooms[0]?.id ?? null;
    }
    if (!classroomId) {
      return NextResponse.json(
        {
          error:
            "No classroom yet. Run onboarding first to create your district of one."
        },
        { status: 409 }
      );
    }

    const objectivesJson = JSON.stringify(body.material.objectives);
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;

    const created = await prisma.unit.create({
      data: {
        classroomId,
        title: body.title,
        description: body.description ?? null,
        dueAt,
        publishedAt: new Date(),
        assignment: {
          create: {
            bodyHtml: body.assignment.bodyHtml,
            rubricJson: body.assignment.rubricJson,
            pointsTotal: body.assignment.pointsTotal
          }
        },
        material: {
          create: {
            sourceHtml: body.material.sourceHtml,
            sourceLexile: body.material.sourceLexile,
            objectives: objectivesJson
          }
        }
      }
    });

    await audit({
      viewer,
      event: "ASSIGNMENT_PUBLISHED",
      subjectId: created.id,
      payload: {
        surface: "self-units",
        classroomId,
        title: created.title
      }
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
