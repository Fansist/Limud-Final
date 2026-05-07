// Teacher dashboard — burnout-reducer view.
// "Today's load — N students who need you" front and center.
// Demo: 3 named students (Maya, Diego, Priya) hard-coded from DEMO_STUDENTS.

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  DEMO_STUDENTS,
  DEMO_TEACHER,
  DEMO_UNITS
} from "@/lib/demo/data";
import { cn, formatRelative } from "@/lib/utils";

type StudentNeedingHelp = {
  studentId: string;
  name: string;
  flagText: string;
  severity: "info" | "warn" | "alert";
};

type FineStudent = {
  studentId: string;
  name: string;
  topMastery: { topic: string; mastery: number } | null;
};

function severityClass(severity: "info" | "warn" | "alert"): string {
  if (severity === "alert") return "badge-alert";
  if (severity === "warn") return "badge-warn";
  return "badge-ok";
}

export default async function TeacherDashboardPage() {
  const viewer = await requireRole("TEACHER");

  const needAttention: StudentNeedingHelp[] = [];
  const fine: FineStudent[] = [];
  let courseLoad = {
    classes: 0,
    totalStudents: 0,
    pendingSubmissions: 0,
    liveUnits: 0,
    primaryClassName: "" as string | null
  };

  if (viewer.kind === "demo") {
    for (const s of DEMO_STUDENTS) {
      if (s.flags.length > 0) {
        const f = s.flags[0];
        if (f) {
          needAttention.push({
            studentId: s.studentId,
            name: s.name,
            flagText: f.text,
            severity: f.severity
          });
        }
      } else {
        const top = s.masteryByTopic[0] ?? null;
        fine.push({
          studentId: s.studentId,
          name: s.name,
          topMastery: top ? { topic: top.topic, mastery: top.mastery } : null
        });
      }
    }
    courseLoad = {
      classes: DEMO_TEACHER.classroomIds.length,
      totalStudents: DEMO_CLASSROOM.studentIds.length,
      pendingSubmissions: 0,
      liveUnits: DEMO_UNITS.length,
      primaryClassName: DEMO_CLASSROOM.name
    };
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId },
      include: {
        classrooms: {
          include: {
            enrollments: {
              include: {
                student: { include: { user: true, mastery: { include: { node: true } } } }
              }
            },
            units: { include: { submissions: true } }
          }
        }
      }
    });

    if (teacher) {
      let totalStudents = 0;
      let pending = 0;
      let liveUnits = 0;
      const seen = new Set<string>();
      for (const c of teacher.classrooms) {
        for (const e of c.enrollments) {
          if (!seen.has(e.studentId)) {
            seen.add(e.studentId);
            totalStudents += 1;
            // Heuristic: a student needs attention if any mastery is < 0.5 with no recent improvement.
            const lowestMastery = e.student.mastery
              .slice()
              .sort((a, b) => a.mastery - b.mastery)[0];
            if (lowestMastery && lowestMastery.mastery < 0.5) {
              const severity: "warn" | "alert" =
                lowestMastery.mastery < 0.3 ? "alert" : "warn";
              needAttention.push({
                studentId: e.studentId,
                name: e.student.user.name ?? e.student.user.email,
                flagText: `Low mastery on "${lowestMastery.node.topic}" (${Math.round(
                  lowestMastery.mastery * 100
                )}%).`,
                severity
              });
            } else {
              const top = e.student.mastery
                .slice()
                .sort((a, b) => b.mastery - a.mastery)[0];
              fine.push({
                studentId: e.studentId,
                name: e.student.user.name ?? e.student.user.email,
                topMastery: top
                  ? { topic: top.node.topic, mastery: top.mastery }
                  : null
              });
            }
          }
        }
        for (const u of c.units) {
          if (u.publishedAt) liveUnits += 1;
          for (const s of u.submissions) {
            if (s.status === "SUBMITTED") pending += 1;
          }
        }
      }
      courseLoad = {
        classes: teacher.classrooms.length,
        totalStudents,
        pendingSubmissions: pending,
        liveUnits,
        primaryClassName: teacher.classrooms[0]?.name ?? null
      };
    }
  }

  const needCount = needAttention.length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-ink-muted">
          {viewer.name ? `Hi, ${viewer.name}.` : "Welcome back."}
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Today's load — {needCount} student{needCount === 1 ? "" : "s"} who
          need you
        </h1>
        <p className="text-ink-soft">
          Limud already reviewed everyone. These are the ones worth your time
          today.
        </p>
      </header>

      {needAttention.length === 0 ? (
        <div className="card p-6">
          <p className="text-ink">
            No students flagged today. Nice work — go do something else.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {needAttention.map((s) => (
            <div key={s.studentId} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{s.name}</h3>
                </div>
                <span className={severityClass(s.severity)}>
                  {s.severity === "alert"
                    ? "Needs help"
                    : s.severity === "warn"
                      ? "Watch"
                      : "Note"}
                </span>
              </div>
              <p className="text-sm text-ink-soft">{s.flagText}</p>
              {viewer.kind === "demo" ? (
                <Link
                  href={`/teacher/classrooms/${DEMO_CLASSROOM.id}/students/${s.studentId}`}
                  className="btn-outline mt-auto text-sm"
                >
                  Open knowledge view
                </Link>
              ) : (
                <Link
                  href={`/teacher/classrooms`}
                  className="btn-outline mt-auto text-sm"
                >
                  View student
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              The rest of the class is fine
            </h2>
            <p className="text-sm text-ink-soft">
              Mastery summary for everyone not flagged today.
            </p>
          </div>
        </div>
        {fine.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Nobody else to summarize right now.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-paper-soft">
            {fine.map((s) => (
              <li
                key={s.studentId}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="font-medium text-ink">{s.name}</span>
                <span className="text-sm text-ink-soft">
                  {s.topMastery
                    ? `${s.topMastery.topic}: ${Math.round(
                        s.topMastery.mastery * 100
                      )}%`
                    : "No mastery data yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <CourseStat label="Classes" value={String(courseLoad.classes)} />
        <CourseStat
          label="Total students"
          value={String(courseLoad.totalStudents)}
        />
        <CourseStat
          label="Live units"
          value={String(courseLoad.liveUnits)}
          sub={courseLoad.primaryClassName ?? undefined}
        />
        <CourseStat
          label="Pending submissions"
          value={String(courseLoad.pendingSubmissions)}
          sub={
            courseLoad.pendingSubmissions === 0
              ? "Inbox zero"
              : "Open submissions queue"
          }
        />
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Teacher quick links</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/teacher/classrooms" className="btn-outline text-sm">
            Manage classrooms
          </Link>
          <Link href="/teacher/submissions" className="btn-outline text-sm">
            Open submissions queue
          </Link>
          {viewer.kind === "demo" ? (
            <Link
              href={`/teacher/units/new?classroom=${DEMO_CLASSROOM.id}`}
              className="btn-primary text-sm"
            >
              + New unit
            </Link>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Updated {formatRelative(new Date())}.
        </p>
      </section>
    </div>
  );
}

function CourseStat({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={cn("card p-4")}>
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-muted">{sub}</div> : null}
    </div>
  );
}
