// POST /api/teacher/units — create a unit + assignment + material atomically.
// GET  /api/teacher/units — list units across this teacher's classrooms.

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CreateUnitSchema = z.object({
  classroomId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assignment: z.object({
    bodyHtml: z.string().min(1),
    rubricJson: z.string().min(2),
    pointsTotal: z.number().int().min(1).max(10000)
  }),
  material: z.object({
    sourceHtml: z.string().min(1),
    sourceLexile: z.number().int().min(0).max(2000),
    objectives: z.array(z.string().min(1)).min(1)
  })
});

export async function GET(): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    if (viewer.kind === "demo") {
      // Demo doesn't query DB; an empty list is fine for the API surface.
      return NextResponse.json({ units: [] });
    }
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId },
      include: { classrooms: { select: { id: true } } }
    });
    if (!teacher) return NextResponse.json({ units: [] });
    const units = await prisma.unit.findMany({
      where: { classroomId: { in: teacher.classrooms.map((c) => c.id) } },
      include: { classroom: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({
      units: units.map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        dueAt: u.dueAt,
        publishedAt: u.publishedAt,
        classroom: u.classroom
      }))
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = CreateUnitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Validate the rubric JSON parses.
    try {
      JSON.parse(body.assignment.rubricJson);
    } catch {
      return NextResponse.json(
        { error: "Rubric is not valid JSON" },
        { status: 400 }
      );
    }

    if (viewer.kind === "demo") {
      throw new AuthError(
        403,
        "Demo mode cannot create units. Use a real account."
      );
    }

    // Confirm the teacher owns the classroom.
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) throw new AuthError(403, "No teacher profile");
    const classroom = await prisma.classroom.findUnique({
      where: { id: body.classroomId }
    });
    if (!classroom || classroom.teacherId !== teacher.id) {
      throw new AuthError(403, "Classroom not yours");
    }

    const created = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({
        data: {
          classroomId: body.classroomId,
          title: body.title,
          description: body.description ?? null,
          dueAt: body.dueAt ? new Date(body.dueAt) : null,
          publishedAt: new Date()
        }
      });
      await tx.assignment.create({
        data: {
          unitId: unit.id,
          bodyHtml: body.assignment.bodyHtml,
          rubricJson: body.assignment.rubricJson,
          pointsTotal: body.assignment.pointsTotal
        }
      });
      await tx.material.create({
        data: {
          unitId: unit.id,
          sourceHtml: body.material.sourceHtml,
          sourceLexile: body.material.sourceLexile,
          objectives: JSON.stringify(body.material.objectives)
        }
      });
      return unit;
    });

    await audit({
      viewer,
      event: "ASSIGNMENT_PUBLISHED",
      subjectId: created.id,
      payload: { classroomId: body.classroomId, title: body.title }
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
