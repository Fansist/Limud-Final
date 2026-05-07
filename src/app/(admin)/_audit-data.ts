// Shared audit + material loaders used by the audit page and the
// /api/admin/audit route. District-scoped. Demo mode synthesizes a set
// of recent events from the demo dataset so the surface is showable
// with zero DB.

import type { AuditEvent } from "@prisma/client";
import type { Viewer } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth";
import {
  DEMO_CLASSROOM,
  DEMO_DISTRICT_ID,
  DEMO_STUDENTS,
  DEMO_TEACHER,
  DEMO_UNITS,
  findDemoRender,
  findDemoUnit
} from "@/lib/demo/data";

export type AuditRow = {
  id: string;
  createdAtIso: string;
  actorName: string;
  actorEmail: string;
  event: AuditEvent;
  subjectId: string | null;
  payload: Record<string, unknown>;
};

export type RenderRow = {
  id: string;
  studentId: string;
  studentName: string;
  modelUsed: string;
  isOffline: boolean;
  createdAtIso: string;
  renderedHtml: string;
};

export type MaterialBundle = {
  unitId: string;
  unitTitle: string;
  classroomName: string;
  sourceHtml: string;
  sourceLexile: number;
  objectives: string[];
  renders: RenderRow[];
};

export type UnitOption = {
  id: string;
  title: string;
  classroomName: string;
};

export type AuditView = {
  districtId: string;
  districtName: string;
  rows: AuditRow[];
  unitOptions: UnitOption[];
  bundle: MaterialBundle | null;
};

function ensureAdmin(viewer: Viewer): void {
  if (viewer.role !== "DISTRICT_ADMIN") {
    throw new AuthError(403, "District admin only");
  }
}

export async function loadAuditView(
  viewer: Viewer,
  args: { unitId?: string; limit?: number } = {}
): Promise<AuditView> {
  ensureAdmin(viewer);
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

  if (viewer.kind === "demo") {
    return loadDemoAudit(args.unitId);
  }

  const admin = await prisma.districtAdmin.findUnique({
    where: { userId: viewer.userId },
    include: { district: true }
  });
  if (!admin) throw new AuthError(403, "Admin record missing");

  const districtId = admin.districtId;

  // Audit log scoped to district actors. An actor is in-district when
  // they are an admin/teacher/student of this district.
  const rawRows = await prisma.auditLog.findMany({
    where: {
      OR: [
        { actor: { admin: { districtId } } },
        { actor: { teacher: { districtId } } },
        { actor: { student: { districtId } } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: true }
  });
  const rows: AuditRow[] = rawRows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(r.payload) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      payload = { _raw: r.payload };
    }
    return {
      id: r.id,
      createdAtIso: r.createdAt.toISOString(),
      actorName: r.actor.name ?? r.actor.email,
      actorEmail: r.actor.email,
      event: r.event,
      subjectId: r.subjectId,
      payload
    };
  });

  // Unit options for the picker — every unit in the district.
  const districtUnits = await prisma.unit.findMany({
    where: { classroom: { districtId } },
    orderBy: { createdAt: "desc" },
    include: { classroom: true }
  });
  const unitOptions: UnitOption[] = districtUnits.map((u) => ({
    id: u.id,
    title: u.title,
    classroomName: u.classroom.name
  }));

  // If a unit is picked (and it lives in this district), load its
  // material + all renders.
  let bundle: MaterialBundle | null = null;
  if (args.unitId) {
    const u = districtUnits.find((x) => x.id === args.unitId);
    if (u) {
      const unitWithMat = await prisma.unit.findUnique({
        where: { id: u.id },
        include: {
          classroom: true,
          material: {
            include: {
              renders: {
                include: { student: { include: { user: true } } },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      });
      if (unitWithMat?.material) {
        let objectives: string[] = [];
        try {
          const parsed = JSON.parse(unitWithMat.material.objectives) as unknown;
          if (Array.isArray(parsed)) {
            objectives = parsed.filter(
              (x): x is string => typeof x === "string"
            );
          }
        } catch {
          objectives = unitWithMat.material.objectives
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        bundle = {
          unitId: unitWithMat.id,
          unitTitle: unitWithMat.title,
          classroomName: unitWithMat.classroom.name,
          sourceHtml: unitWithMat.material.sourceHtml,
          sourceLexile: unitWithMat.material.sourceLexile,
          objectives,
          renders: unitWithMat.material.renders.map((r) => ({
            id: r.id,
            studentId: r.studentId,
            studentName: r.student.user.name ?? r.student.user.email,
            modelUsed: r.modelUsed,
            isOffline: r.isOffline,
            createdAtIso: r.createdAt.toISOString(),
            renderedHtml: r.renderedHtml
          }))
        };
      }
    }
  }

  return {
    districtId,
    districtName: admin.district.name,
    rows,
    unitOptions,
    bundle
  };
}

function loadDemoAudit(unitId?: string): AuditView {
  const rows = synthesizeDemoAuditRows();
  const unitOptions: UnitOption[] = DEMO_UNITS.map((u) => ({
    id: u.id,
    title: u.title,
    classroomName: DEMO_CLASSROOM.name
  }));
  // Default to the French Revolution unit when nothing picked.
  const targetUnitId = unitId ?? DEMO_UNITS[0]?.id ?? null;
  const u = targetUnitId ? findDemoUnit(targetUnitId) : null;
  let bundle: MaterialBundle | null = null;
  if (u) {
    const renders: RenderRow[] = [];
    for (const s of DEMO_STUDENTS) {
      const html = findDemoRender(u.material.demoKey, s.studentId);
      if (!html) continue;
      renders.push({
        id: `demo-render-${s.studentId}`,
        studentId: s.studentId,
        studentName: s.name,
        modelUsed: "demo",
        isOffline: true,
        createdAtIso: u.publishedAt,
        renderedHtml: html
      });
    }
    bundle = {
      unitId: u.id,
      unitTitle: u.title,
      classroomName: DEMO_CLASSROOM.name,
      sourceHtml: u.material.sourceHtml,
      sourceLexile: u.material.sourceLexile,
      objectives: u.material.objectives,
      renders
    };
  }
  return {
    districtId: DEMO_DISTRICT_ID,
    districtName: "Demo District",
    rows,
    unitOptions,
    bundle
  };
}

function synthesizeDemoAuditRows(): AuditRow[] {
  // Build a believable, time-decreasing sequence of audit events from
  // the demo dataset. No DB writes — this is purely a display-side
  // fabrication that always works in demo mode.
  const now = Date.now();
  const min = 60_000;
  const hr = 60 * min;
  const teacher = {
    name: DEMO_TEACHER.name,
    email: "alvarez@demo.limud.test"
  };
  const unit = DEMO_UNITS[0];
  if (!unit) return [];
  const out: AuditRow[] = [
    {
      id: "demo-audit-1",
      createdAtIso: new Date(now - 12 * min).toISOString(),
      actorName: teacher.name,
      actorEmail: teacher.email,
      event: "MATERIAL_REVIEWED",
      subjectId: "demo-student-maya",
      payload: {
        unitId: unit.id,
        surface: "teacher-preview",
        studentName: "Maya"
      }
    },
    {
      id: "demo-audit-2",
      createdAtIso: new Date(now - 38 * min).toISOString(),
      actorName: teacher.name,
      actorEmail: teacher.email,
      event: "MATERIAL_REVIEWED",
      subjectId: "demo-student-diego",
      payload: {
        unitId: unit.id,
        surface: "teacher-preview",
        studentName: "Diego"
      }
    },
    {
      id: "demo-audit-3",
      createdAtIso: new Date(now - 1 * hr - 4 * min).toISOString(),
      actorName: "Maya (demo student)",
      actorEmail: "maya@demo.limud.test",
      event: "MATERIAL_RENDERED",
      subjectId: unit.id,
      payload: { offline: true, modelUsed: "demo" }
    },
    {
      id: "demo-audit-4",
      createdAtIso: new Date(now - 1 * hr - 22 * min).toISOString(),
      actorName: "Diego (demo student)",
      actorEmail: "diego@demo.limud.test",
      event: "MATERIAL_RENDERED",
      subjectId: unit.id,
      payload: { offline: true, modelUsed: "demo" }
    },
    {
      id: "demo-audit-5",
      createdAtIso: new Date(now - 1 * hr - 41 * min).toISOString(),
      actorName: "Priya (demo student)",
      actorEmail: "priya@demo.limud.test",
      event: "MATERIAL_RENDERED",
      subjectId: unit.id,
      payload: { offline: true, modelUsed: "demo" }
    },
    {
      id: "demo-audit-6",
      createdAtIso: new Date(now - 2 * hr).toISOString(),
      actorName: teacher.name,
      actorEmail: teacher.email,
      event: "ASSIGNMENT_PUBLISHED",
      subjectId: unit.id,
      payload: { unitTitle: unit.title }
    },
    {
      id: "demo-audit-7",
      createdAtIso: new Date(now - 2 * hr - 30 * min).toISOString(),
      actorName: "Maya (demo student)",
      actorEmail: "maya@demo.limud.test",
      event: "TUTOR_SESSION_OPENED",
      subjectId: unit.id,
      payload: { mode: "SOCRATIC" }
    },
    {
      id: "demo-audit-8",
      createdAtIso: new Date(now - 5 * hr).toISOString(),
      actorName: "Mr. Chen (demo parent)",
      actorEmail: "chen@demo.limud.test",
      event: "CROSS_ROLE_VIEW",
      subjectId: "demo-student-maya",
      payload: { surface: "parent-child-material" }
    },
    {
      id: "demo-audit-9",
      createdAtIso: new Date(now - 23 * hr).toISOString(),
      actorName: teacher.name,
      actorEmail: teacher.email,
      event: "SUBMISSION_GRADED",
      subjectId: "demo-student-priya",
      payload: { unitId: unit.id, scoreFinal: 92 }
    }
  ];
  return out;
}
