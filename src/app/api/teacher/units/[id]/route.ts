// GET  /api/teacher/units/[id] — return unit + assignment + material.
// PUT  /api/teacher/units/[id] — update; republish invalidates renders.

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const UpdateUnitSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assignment: z
    .object({
      bodyHtml: z.string().min(1),
      rubricJson: z.string().min(2),
      pointsTotal: z.number().int().min(1).max(10000)
    })
    .optional(),
  material: z
    .object({
      sourceHtml: z.string().min(1),
      sourceLexile: z.number().int().min(0).max(2000),
      objectives: z.array(z.string().min(1)).min(1)
    })
    .optional()
});

async function getOwnedUnit(viewer: { userId: string }, unitId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: viewer.userId }
  });
  if (!teacher) throw new AuthError(403, "No teacher profile");
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { classroom: true, assignment: true, material: true }
  });
  if (!unit || unit.classroom.teacherId !== teacher.id) {
    throw new AuthError(404, "Unit not found");
  }
  return unit;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    if (viewer.kind === "demo") {
      throw new AuthError(403, "Demo mode does not expose this API.");
    }
    const unit = await getOwnedUnit(viewer, params.id);
    return NextResponse.json({
      id: unit.id,
      classroomId: unit.classroomId,
      title: unit.title,
      description: unit.description,
      dueAt: unit.dueAt,
      publishedAt: unit.publishedAt,
      assignment: unit.assignment
        ? {
            bodyHtml: unit.assignment.bodyHtml,
            rubricJson: unit.assignment.rubricJson,
            pointsTotal: unit.assignment.pointsTotal
          }
        : null,
      material: unit.material
        ? {
            sourceHtml: unit.material.sourceHtml,
            sourceLexile: unit.material.sourceLexile,
            objectives: unit.material.objectives
          }
        : null
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    if (viewer.kind === "demo") {
      throw new AuthError(403, "Demo mode cannot edit units.");
    }
    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = UpdateUnitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const unit = await getOwnedUnit(viewer, params.id);

    if (body.assignment) {
      try {
        JSON.parse(body.assignment.rubricJson);
      } catch {
        return NextResponse.json(
          { error: "Rubric is not valid JSON" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      const updateUnitData: {
        title?: string;
        description?: string | null;
        dueAt?: Date | null;
      } = {};
      if (body.title !== undefined) updateUnitData.title = body.title;
      if (body.description !== undefined)
        updateUnitData.description = body.description;
      if (body.dueAt !== undefined)
        updateUnitData.dueAt = body.dueAt ? new Date(body.dueAt) : null;
      if (Object.keys(updateUnitData).length > 0) {
        await tx.unit.update({
          where: { id: unit.id },
          data: updateUnitData
        });
      }

      if (body.assignment && unit.assignment) {
        await tx.assignment.update({
          where: { id: unit.assignment.id },
          data: {
            bodyHtml: body.assignment.bodyHtml,
            rubricJson: body.assignment.rubricJson,
            pointsTotal: body.assignment.pointsTotal
          }
        });
      }

      if (body.material && unit.material) {
        await tx.material.update({
          where: { id: unit.material.id },
          data: {
            sourceHtml: body.material.sourceHtml,
            sourceLexile: body.material.sourceLexile,
            objectives: JSON.stringify(body.material.objectives)
          }
        });
        // Republishing the material invalidates every cached render.
        await tx.materialRender.deleteMany({
          where: { materialId: unit.material.id }
        });
      }
    });

    await audit({
      viewer,
      event: "ASSIGNMENT_PUBLISHED",
      subjectId: unit.id,
      payload: { reason: "republish", unitId: unit.id }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
