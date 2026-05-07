// GET /api/parent/children/[id]
// Returns aggregated progress JSON for the requested child.
// Validates parent-child link first; 403 if not linked.

import { NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  requireRole
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  DEMO_PARENT,
  findDemoStudent
} from "@/lib/demo/data";

type RouteContext = { params: { id: string } };

export async function GET(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const viewer = await requireRole("PARENT");
    const childId = ctx.params.id;

    if (viewer.kind === "demo") {
      if (!DEMO_PARENT.childIds.includes(childId)) {
        throw new AuthError(403, "Not your child");
      }
      const s = findDemoStudent(childId);
      if (!s) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const total = s.grades.reduce((a, g) => a + g.grade, 0);
      const avg = s.grades.length > 0 ? Math.round(total / s.grades.length) : null;
      await audit({
        viewer,
        event: "CROSS_ROLE_VIEW",
        subjectId: childId,
        payload: { route: `/api/parent/children/${childId}` }
      });
      return NextResponse.json({
        studentId: s.studentId,
        name: s.name,
        gradeLevel: s.gradeLevel,
        lexile: s.lexile,
        learningStyles: s.learningStyles,
        interests: s.interests,
        overallGrade: avg,
        grades: s.grades,
        masteryByTopic: s.masteryByTopic,
        flags: s.flags
      });
    }

    const parent = await prisma.parent.findUnique({
      where: { userId: viewer.userId },
      include: { children: true }
    });
    const link = parent?.children.find((c) => c.studentId === childId);
    if (!parent || !link) {
      throw new AuthError(403, "Not your child");
    }
    const child = await prisma.student.findUnique({
      where: { id: childId },
      include: {
        user: true,
        mastery: { include: { node: true } },
        submissions: {
          // Drafts are excluded — parents can read graded work only per
          // ROLES-GUIDE.
          where: { status: { in: ["GRADED", "RETURNED", "SUBMITTED"] } },
          include: { unit: { include: { classroom: true } } },
          orderBy: { updatedAt: "desc" }
        }
      }
    });
    if (!child) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const grades = child.submissions
      .filter((s) => s.scoreFinal !== null)
      .map((s) => ({
        course: s.unit.classroom.subject,
        grade: s.scoreFinal as number,
        submittedAt: s.submittedAt?.toISOString() ?? null
      }));
    const overall =
      grades.length > 0
        ? Math.round(grades.reduce((a, g) => a + g.grade, 0) / grades.length)
        : null;
    const mastery = child.mastery.map((m) => ({
      topic: m.node.topic,
      mastery: m.mastery,
      lastSeenAt: m.lastSeenAt.toISOString()
    }));
    const lowest = mastery.slice().sort((a, b) => a.mastery - b.mastery)[0];
    const flags: Array<{ severity: "info" | "warn" | "alert"; text: string }> = [];
    if (lowest && lowest.mastery < 0.5) {
      flags.push({
        severity: lowest.mastery < 0.3 ? "alert" : "warn",
        text: `Low mastery on "${lowest.topic}" (${Math.round(lowest.mastery * 100)}%).`
      });
    }

    await audit({
      viewer,
      event: "CROSS_ROLE_VIEW",
      subjectId: childId,
      payload: { route: `/api/parent/children/${childId}` }
    });

    return NextResponse.json({
      studentId: child.id,
      name: child.user.name ?? child.user.email,
      gradeLevel: child.gradeLevel,
      lexile: child.lexile,
      learningStyles: child.learningStyles
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0),
      interests: child.interests
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0),
      overallGrade: overall,
      grades,
      masteryByTopic: mastery,
      flags,
      submissions: child.submissions.map((s) => ({
        id: s.id,
        unitId: s.unitId,
        unitTitle: s.unit.title,
        status: s.status,
        scoreFinal: s.scoreFinal,
        submittedAt: s.submittedAt?.toISOString() ?? null
      }))
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
