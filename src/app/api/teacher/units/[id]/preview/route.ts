// POST /api/teacher/units/[id]/preview { studentId }
// Personalize for the student, persist a MaterialRender, audit, return result.

import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import {
  personalizeMaterial,
  profileHash
} from "@/lib/ai/personalize";
import {
  findDemoStudent,
  findDemoUnit
} from "@/lib/demo/data";
import type { StudentProfile } from "@/lib/types";

const PreviewSchema = z.object({ studentId: z.string().min(1) });

function parseObjectives(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    /* noop */
  }
  return [];
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const viewer = await requireRole("TEACHER");
    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = PreviewSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { studentId } = parsed.data;
    const unitId = params.id;

    if (viewer.kind === "demo") {
      const u = findDemoUnit(unitId);
      const s = findDemoStudent(studentId);
      if (!u || !s) {
        throw new AuthError(404, "Demo unit/student not found");
      }
      const profile: StudentProfile = {
        studentId: s.studentId,
        name: s.name,
        gradeLevel: s.gradeLevel,
        lexile: s.lexile,
        language: s.language,
        learningStyles: s.learningStyles,
        interests: s.interests
      };
      const result = await personalizeMaterial({
        sourceHtml: u.material.sourceHtml,
        objectives: u.material.objectives,
        profile,
        demoMaterialKey: u.material.demoKey
      });
      return NextResponse.json(result);
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) throw new AuthError(403, "No teacher profile");

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { classroom: true, material: true }
    });
    if (!unit || unit.classroom.teacherId !== teacher.id) {
      throw new AuthError(404, "Unit not found");
    }
    if (!unit.material) {
      throw new AuthError(400, "Unit has no material to preview");
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classroomId: unit.classroomId },
      include: { student: { include: { user: true } } }
    });
    if (!enrollment) {
      throw new AuthError(403, "Student is not enrolled in this classroom");
    }

    const s = enrollment.student;
    const profile: StudentProfile = {
      studentId: s.id,
      name: s.user.name ?? s.user.email,
      gradeLevel: s.gradeLevel,
      lexile: s.lexile,
      language: s.language,
      learningStyles: s.learningStyles
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      interests: s.interests
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    };

    const result = await personalizeMaterial({
      sourceHtml: unit.material.sourceHtml,
      objectives: parseObjectives(unit.material.objectives),
      profile
    });

    await prisma.materialRender.upsert({
      where: {
        materialId_studentId: {
          materialId: unit.material.id,
          studentId
        }
      },
      update: {
        renderedHtml: result.html,
        modelUsed: result.modelUsed,
        isOffline: result.offline,
        profileHash: profileHash(profile)
      },
      create: {
        materialId: unit.material.id,
        studentId,
        renderedHtml: result.html,
        modelUsed: result.modelUsed,
        isOffline: result.offline,
        profileHash: profileHash(profile)
      }
    });

    await audit({
      viewer,
      event: "MATERIAL_REVIEWED",
      subjectId: studentId,
      payload: { unitId, materialId: unit.material.id }
    });

    return NextResponse.json(result);
  } catch (err) {
    return authErrorResponse(err);
  }
}
