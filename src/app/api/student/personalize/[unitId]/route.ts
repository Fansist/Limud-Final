// GET /api/student/personalize/[unitId]
// Returns { html, modelUsed, offline } for the viewer's personalized
// MaterialRender of this unit. Loads cache when valid, else recomputes
// and upserts. Demo mode short-circuits via DEMO_UNITS + findDemoRender.

import { NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  requireRole
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  findDemoStudent,
  findDemoUnit
} from "@/lib/demo/data";
import { personalizeMaterial, profileHash } from "@/lib/ai/personalize";
import { audit } from "@/lib/audit";
import type { StudentProfile } from "@/lib/types";

function parseList(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

export async function GET(
  _req: Request,
  context: { params: { unitId: string } }
): Promise<Response> {
  try {
    const viewer = await requireRole("STUDENT");
    const unitId = context.params.unitId;

    if (viewer.kind === "demo") {
      const unit = findDemoUnit(unitId);
      if (!unit || unit.classroomId !== DEMO_CLASSROOM.id) {
        throw new AuthError(404, "Unit not found");
      }
      const student =
        findDemoStudent(viewer.demoStudentId ?? "demo-student-maya") ??
        findDemoStudent("demo-student-maya");
      if (!student) throw new AuthError(404, "Demo student not found");
      const profile: StudentProfile = {
        studentId: student.studentId,
        name: student.name,
        gradeLevel: student.gradeLevel,
        lexile: student.lexile,
        language: student.language,
        learningStyles: student.learningStyles,
        interests: student.interests
      };
      const render = await personalizeMaterial({
        sourceHtml: unit.material.sourceHtml,
        objectives: unit.material.objectives,
        profile,
        demoMaterialKey: unit.material.demoKey
      });
      return NextResponse.json(render);
    }

    // Real mode.
    const student = await prisma.student.findUnique({
      where: { userId: viewer.userId }
    });
    if (!student) throw new AuthError(404, "Student record not found");
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { material: true }
    });
    if (!unit || !unit.material) throw new AuthError(404, "Unit not found");
    // Confirm the student is enrolled in the classroom this unit belongs to.
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: unit.classroomId,
          studentId: student.id
        }
      }
    });
    if (!enrollment) throw new AuthError(403, "Not enrolled in this classroom");

    const profile: StudentProfile = {
      studentId: student.id,
      name: viewer.name ?? "Student",
      gradeLevel: student.gradeLevel,
      lexile: student.lexile,
      language: student.language,
      learningStyles: parseList(student.learningStyles),
      interests: parseList(student.interests)
    };
    const expectHash = profileHash(profile);

    let cached = await prisma.materialRender.findUnique({
      where: {
        materialId_studentId: {
          materialId: unit.material.id,
          studentId: student.id
        }
      }
    });
    if (
      cached &&
      (cached.profileHash !== expectHash ||
        unit.material.updatedAt.getTime() > cached.createdAt.getTime())
    ) {
      await prisma.materialRender.delete({ where: { id: cached.id } });
      cached = null;
    }
    if (cached) {
      return NextResponse.json({
        html: cached.renderedHtml,
        modelUsed: cached.modelUsed,
        offline: cached.isOffline
      });
    }
    let objectives: string[] = [];
    try {
      const parsed = JSON.parse(unit.material.objectives) as unknown;
      if (Array.isArray(parsed)) {
        objectives = parsed.filter((s): s is string => typeof s === "string");
      }
    } catch {
      objectives = [];
    }
    const render = await personalizeMaterial({
      sourceHtml: unit.material.sourceHtml,
      objectives,
      profile
    });
    await prisma.materialRender.upsert({
      where: {
        materialId_studentId: {
          materialId: unit.material.id,
          studentId: student.id
        }
      },
      update: {
        renderedHtml: render.html,
        profileHash: expectHash,
        modelUsed: render.modelUsed,
        isOffline: render.offline
      },
      create: {
        materialId: unit.material.id,
        studentId: student.id,
        renderedHtml: render.html,
        profileHash: expectHash,
        modelUsed: render.modelUsed,
        isOffline: render.offline
      }
    });
    await audit({
      viewer,
      event: "MATERIAL_RENDERED",
      subjectId: unit.id,
      payload: { offline: render.offline, modelUsed: render.modelUsed }
    });
    return NextResponse.json(render);
  } catch (err) {
    return authErrorResponse(err);
  }
}
