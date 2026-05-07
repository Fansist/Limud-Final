// District rollup loader. Used by the admin overview page and the
// /api/admin/rollup route so they stay in lock-step. Scoped to one
// district by `districtId` always — admin can read EVERYTHING in their
// district and NOTHING in another.

import type { Viewer } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth";
import {
  DEMO_CLASSROOM,
  DEMO_DISTRICT_ID,
  DEMO_STUDENTS,
  DEMO_TEACHER,
  DEMO_UNITS
} from "@/lib/demo/data";

export type TeacherLoadRow = {
  teacherId: string;
  name: string;
  studentCount: number;
  activeUnits: number;
  pendingSubmissions: number;
  // True when this teacher's student count exceeds the district mean.
  isOverloaded: boolean;
};

export type EquityBucket = {
  subject: string;
  // Per learning-style averages. Missing styles are zeroed so the chart
  // still draws a baseline.
  byStyle: Array<{ style: string; mastery: number; sampleSize: number }>;
};

export type EscalationRow = {
  studentId: string;
  studentName: string;
  classroom: string;
  text: string;
  severity: "info" | "warn" | "alert";
};

export type DistrictRollup = {
  districtId: string;
  districtName: string;
  counts: {
    teachers: number;
    classrooms: number;
    students: number;
    activeUnits: number;
  };
  teacherLoad: TeacherLoadRow[];
  equity: EquityBucket[];
  escalations: EscalationRow[];
};

const CANONICAL_STYLES: ReadonlyArray<string> = [
  "visual",
  "auditory",
  "kinesthetic",
  "reading_writing"
];

function bucketByStyle(
  samples: Array<{ style: string; mastery: number }>
): EquityBucket["byStyle"] {
  const map = new Map<string, { sum: number; n: number }>();
  for (const s of samples) {
    const key = s.style.trim();
    if (!key) continue;
    const acc = map.get(key) ?? { sum: 0, n: 0 };
    acc.sum += s.mastery;
    acc.n += 1;
    map.set(key, acc);
  }
  const out: EquityBucket["byStyle"] = [];
  for (const style of CANONICAL_STYLES) {
    const v = map.get(style);
    out.push({
      style,
      mastery: v && v.n > 0 ? v.sum / v.n : 0,
      sampleSize: v?.n ?? 0
    });
  }
  return out;
}

function ensureAdminViewer(viewer: Viewer): void {
  if (viewer.role !== "DISTRICT_ADMIN") {
    throw new AuthError(403, "District admin only");
  }
}

export async function loadDistrictRollup(
  viewer: Viewer
): Promise<DistrictRollup> {
  ensureAdminViewer(viewer);

  if (viewer.kind === "demo") {
    return loadDemoRollup();
  }

  const admin = await prisma.districtAdmin.findUnique({
    where: { userId: viewer.userId },
    include: { district: true }
  });
  if (!admin) {
    throw new AuthError(403, "Admin record missing");
  }

  const districtId = admin.districtId;
  const districtName = admin.district.name;

  const [teachers, classrooms, students, activeUnits] = await Promise.all([
    prisma.teacher.findMany({
      where: { districtId },
      include: {
        user: true,
        classrooms: {
          include: {
            enrollments: { select: { studentId: true } },
            units: {
              include: {
                submissions: { select: { id: true, status: true } }
              }
            }
          }
        }
      }
    }),
    prisma.classroom.count({ where: { districtId } }),
    prisma.student.findMany({
      where: { districtId },
      include: {
        user: true,
        mastery: { include: { node: true } },
        enrollments: { include: { classroom: true } }
      }
    }),
    prisma.unit.count({
      where: {
        publishedAt: { not: null },
        classroom: { districtId }
      }
    })
  ]);

  // Teacher load
  const rawLoads: Array<TeacherLoadRow & { _avgBase: number }> = teachers.map(
    (t) => {
      const seen = new Set<string>();
      let pending = 0;
      let active = 0;
      for (const c of t.classrooms) {
        for (const e of c.enrollments) seen.add(e.studentId);
        for (const u of c.units) {
          // A unit lives in exactly one classroom, so summing across
          // this teacher's classrooms is the right active-unit count.
          active += 1;
          for (const s of u.submissions) {
            if (s.status === "SUBMITTED") pending += 1;
          }
        }
      }
      return {
        teacherId: t.id,
        name: t.user.name ?? t.user.email,
        studentCount: seen.size,
        activeUnits: active,
        pendingSubmissions: pending,
        isOverloaded: false,
        _avgBase: seen.size
      };
    }
  );
  const meanLoad =
    rawLoads.length === 0
      ? 0
      : rawLoads.reduce((a, r) => a + r._avgBase, 0) / rawLoads.length;
  const teacherLoad: TeacherLoadRow[] = rawLoads.map((r) => ({
    teacherId: r.teacherId,
    name: r.name,
    studentCount: r.studentCount,
    activeUnits: r.activeUnits,
    pendingSubmissions: r.pendingSubmissions,
    isOverloaded: meanLoad > 0 && r.studentCount > meanLoad
  }));

  // Equity buckets per subject. Build one bucket per distinct subject
  // we see across classrooms.
  const subjectByClassroom = new Map<string, string>();
  for (const t of teachers) {
    for (const c of t.classrooms) subjectByClassroom.set(c.id, c.subject);
  }
  // Build subject -> samples
  const samplesBySubject = new Map<
    string,
    Array<{ style: string; mastery: number }>
  >();
  for (const s of students) {
    const styles = s.learningStyles
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (styles.length === 0) continue;
    const subjects = new Set<string>();
    for (const e of s.enrollments) {
      const subj = subjectByClassroom.get(e.classroomId) ?? e.classroom.subject;
      subjects.add(subj);
    }
    if (subjects.size === 0) continue;
    // Average this student's mastery rows.
    const avg =
      s.mastery.length === 0
        ? 0
        : s.mastery.reduce((a, m) => a + m.mastery, 0) / s.mastery.length;
    for (const subj of subjects) {
      const arr = samplesBySubject.get(subj) ?? [];
      // primary style is the first listed
      const primary = styles[0] ?? "visual";
      arr.push({ style: primary, mastery: avg });
      samplesBySubject.set(subj, arr);
    }
  }
  const equity: EquityBucket[] = [];
  for (const [subject, samples] of samplesBySubject.entries()) {
    equity.push({ subject, byStyle: bucketByStyle(samples) });
  }
  equity.sort((a, b) => a.subject.localeCompare(b.subject));

  // Escalations: students with low mastery (<0.3) become alert; <0.5 warn.
  const escalations: EscalationRow[] = [];
  for (const s of students) {
    if (s.mastery.length === 0) continue;
    const lowest = [...s.mastery].sort((a, b) => a.mastery - b.mastery)[0];
    if (!lowest) continue;
    if (lowest.mastery >= 0.5) continue;
    const severity: "warn" | "alert" =
      lowest.mastery < 0.3 ? "alert" : "warn";
    const enrollment = s.enrollments[0];
    const classroomName = enrollment?.classroom.name ?? "—";
    escalations.push({
      studentId: s.id,
      studentName: s.user.name ?? s.user.email,
      classroom: classroomName,
      text: `Low mastery on "${lowest.node.topic}" (${Math.round(
        lowest.mastery * 100
      )}%)`,
      severity
    });
  }
  escalations.sort((a, b) => {
    const order = (sev: "warn" | "alert" | "info"): number =>
      sev === "alert" ? 0 : sev === "warn" ? 1 : 2;
    return order(a.severity) - order(b.severity);
  });

  return {
    districtId,
    districtName,
    counts: {
      teachers: teachers.length,
      classrooms,
      students: students.length,
      activeUnits
    },
    teacherLoad,
    equity,
    escalations: escalations.slice(0, 10)
  };
}

function loadDemoRollup(): DistrictRollup {
  // The demo district is "the district". Fabricate a believable
  // distribution from the 3 demo students so every surface is showable
  // with zero DB.
  const teacherLoad: TeacherLoadRow[] = [
    {
      teacherId: DEMO_TEACHER.id,
      name: DEMO_TEACHER.name,
      studentCount: DEMO_STUDENTS.length,
      activeUnits: DEMO_UNITS.length,
      pendingSubmissions: 1,
      isOverloaded: false
    }
  ];

  // Equity: one bucket per subject. Use each student's primary style
  // and their mean mastery as the data point. The brief calls this out.
  const equitySamples: Array<{ style: string; mastery: number }> =
    DEMO_STUDENTS.map((s) => ({
      style: s.learningStyles[0] ?? "visual",
      mastery:
        s.masteryByTopic.length === 0
          ? 0
          : s.masteryByTopic.reduce((a, m) => a + m.mastery, 0) /
            s.masteryByTopic.length
    }));
  const equity: EquityBucket[] = [
    { subject: DEMO_CLASSROOM.subject, byStyle: bucketByStyle(equitySamples) }
  ];

  // Escalations: surface alert-severity flags from the demo students.
  const escalations: EscalationRow[] = [];
  for (const s of DEMO_STUDENTS) {
    for (const f of s.flags) {
      if (f.severity === "info") continue;
      escalations.push({
        studentId: s.studentId,
        studentName: s.name,
        classroom: DEMO_CLASSROOM.name,
        text: f.text,
        severity: f.severity
      });
    }
  }
  // Always surface the lowest-mastery topic as an alert too — this gives
  // the demo dashboard at least one "needs help" row.
  for (const s of DEMO_STUDENTS) {
    const lowest = [...s.masteryByTopic].sort((a, b) => a.mastery - b.mastery)[0];
    if (lowest && lowest.mastery < 0.3) {
      escalations.push({
        studentId: s.studentId,
        studentName: s.name,
        classroom: DEMO_CLASSROOM.name,
        text: `Low mastery on "${lowest.topic}" (${Math.round(
          lowest.mastery * 100
        )}%)`,
        severity: "alert"
      });
    }
  }

  return {
    districtId: DEMO_DISTRICT_ID,
    districtName: "Demo District",
    counts: {
      teachers: 1,
      classrooms: 1,
      students: DEMO_STUDENTS.length,
      activeUnits: DEMO_UNITS.length
    },
    teacherLoad,
    equity,
    escalations
  };
}
