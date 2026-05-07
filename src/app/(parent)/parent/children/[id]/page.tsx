// Per-child parent view. Validates the child is linked to this parent
// via ParentChild (in real mode) or via DEMO_PARENT.childIds (in demo).
// Logs CROSS_ROLE_VIEW on every load — required by ROLES-GUIDE.

import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthError, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  DEMO_PARENT,
  DEMO_UNITS,
  findDemoStudent,
  findDemoUnit
} from "@/lib/demo/data";
import { cn, formatDate, pct } from "@/lib/utils";
import { GradeTrendChart, type GradeTrendSeries } from "./GradeTrendChart";

type ChildHeader = {
  studentId: string;
  name: string;
  gradeLevel: number;
  primaryLearningStyle: string;
  lexile: number;
};

type MasterySummary = { topic: string; mastery: number; trend: "up" | "flat" | "down" };
type ChildFlag = { severity: "info" | "warn" | "alert"; text: string };
type RecentSubmission = {
  id: string;
  unitTitle: string;
  status: string;
  scoreFinal: number | null;
  submittedAt: string | null;
};

type PageProps = { params: { id: string } };

function severityClass(severity: "info" | "warn" | "alert"): string {
  if (severity === "alert") return "badge-alert";
  if (severity === "warn") return "badge-warn";
  return "badge-ok";
}

function trendArrow(trend: "up" | "flat" | "down" | "improving" | "steady" | "slipping"): string {
  if (trend === "up" || trend === "improving") return "↑";
  if (trend === "down" || trend === "slipping") return "↓";
  return "→";
}

function statusBadge(status: string): string {
  if (status === "GRADED" || status === "RETURNED") return "badge-ok";
  if (status === "SUBMITTED") return "badge-warn";
  return "badge";
}

function buildDemoSeries(courseGrades: { course: string; grade: number }[]): GradeTrendSeries[] {
  // Synthesize a tiny 4-point trajectory so the chart looks meaningful.
  // Each course ends at the current grade; earlier weeks are slightly
  // lower so the chart shows movement.
  return courseGrades.map((g) => {
    const end = g.grade;
    const start = Math.max(50, end - 8);
    const a = Math.round(start);
    const b = Math.round(start + (end - start) * 0.4);
    const c = Math.round(start + (end - start) * 0.7);
    const d = Math.round(end);
    return {
      course: g.course,
      points: [
        { label: "Wk 1", grade: a },
        { label: "Wk 2", grade: b },
        { label: "Wk 3", grade: c },
        { label: "Now", grade: d }
      ]
    };
  });
}

export default async function ParentChildPage({ params }: PageProps): Promise<JSX.Element> {
  const viewer = await requireRole("PARENT");
  const childId = params.id;

  let header: ChildHeader | null = null;
  let mastery: MasterySummary[] = [];
  let flags: ChildFlag[] = [];
  let series: GradeTrendSeries[] = [];
  let submissions: RecentSubmission[] = [];
  // The unit to deep-link to "read what they're reading".
  let activeUnit: { id: string; title: string } | null = null;

  if (viewer.kind === "demo") {
    if (!DEMO_PARENT.childIds.includes(childId)) {
      // Per ROLES-GUIDE: parent can only read linked children.
      throw new AuthError(403, "Not your child");
    }
    const s = findDemoStudent(childId);
    if (!s) {
      notFound();
    }
    header = {
      studentId: s.studentId,
      name: s.name,
      gradeLevel: s.gradeLevel,
      primaryLearningStyle: s.learningStyles[0] ?? "visual",
      lexile: s.lexile
    };
    mastery = s.masteryByTopic;
    flags = s.flags;
    series = buildDemoSeries(s.grades.map((g) => ({ course: g.course, grade: g.grade })));
    // Demo: no real submissions; surface the demo unit as upcoming work.
    const demoUnit = findDemoUnit(DEMO_CLASSROOM.unitIds[0] ?? "");
    if (demoUnit) {
      submissions = [
        {
          id: `demo-sub-${s.studentId}`,
          unitTitle: demoUnit.title,
          status: "DRAFT",
          scoreFinal: null,
          submittedAt: null
        }
      ];
      activeUnit = { id: demoUnit.id, title: demoUnit.title };
    }
  } else {
    const parent = await prisma.parent.findUnique({
      where: { userId: viewer.userId },
      include: { children: true }
    });
    const link = parent?.children.find((c) => c.studentId === childId);
    if (!parent || !link) {
      throw new AuthError(403, "Not your child");
    }
    const student = await prisma.student.findUnique({
      where: { id: childId },
      include: {
        user: true,
        mastery: { include: { node: true }, orderBy: { lastSeenAt: "desc" } },
        submissions: {
          // Per ROLES-GUIDE, parents see GRADED work only. In-grading
          // and DRAFT remain private to the student + teacher.
          where: { status: { in: ["GRADED", "RETURNED"] } },
          include: { unit: { include: { classroom: true } } },
          orderBy: { updatedAt: "desc" }
        },
        enrollments: {
          include: {
            classroom: {
              include: {
                units: {
                  where: { publishedAt: { not: null } },
                  orderBy: { updatedAt: "desc" }
                }
              }
            }
          }
        }
      }
    });
    if (!student) notFound();
    header = {
      studentId: student.id,
      name: student.user.name ?? student.user.email,
      gradeLevel: student.gradeLevel,
      primaryLearningStyle: (student.learningStyles.split(",")[0] ?? "visual").trim(),
      lexile: student.lexile
    };
    mastery = student.mastery.map((m) => ({
      topic: m.node.topic,
      mastery: m.mastery,
      trend: "flat"
    }));
    // Build flags from low-mastery topics. Real-world rules will live in
    // a richer "Detect" service; we surface the most actionable signal.
    const lowest = student.mastery.slice().sort((a, b) => a.mastery - b.mastery)[0];
    if (lowest && lowest.mastery < 0.5) {
      flags.push({
        severity: lowest.mastery < 0.3 ? "alert" : "warn",
        text: `Low mastery on "${lowest.node.topic}" (${pct(lowest.mastery)}).`
      });
    }
    // Group graded submissions per course for a real grade trend.
    const buckets = new Map<string, Array<{ label: string; grade: number }>>();
    for (const sub of student.submissions) {
      if (sub.scoreFinal === null) continue;
      const course = sub.unit.classroom.subject;
      const arr = buckets.get(course) ?? [];
      arr.push({
        label: formatDate(sub.submittedAt ?? sub.updatedAt, { month: "short", day: "numeric" }),
        grade: sub.scoreFinal
      });
      buckets.set(course, arr);
    }
    series = Array.from(buckets.entries()).map(([course, points]) => ({
      course,
      // Restore chronological order (we collected in reverse).
      points: points.slice().reverse()
    }));
    submissions = student.submissions.slice(0, 5).map((s) => ({
      id: s.id,
      unitTitle: s.unit.title,
      status: s.status,
      scoreFinal: s.scoreFinal,
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null
    }));
    // Pick the most recent published unit across the child's classrooms.
    let mostRecent: { id: string; title: string; updatedAt: Date } | null = null;
    for (const enr of student.enrollments) {
      for (const u of enr.classroom.units) {
        if (!mostRecent || u.updatedAt > mostRecent.updatedAt) {
          mostRecent = { id: u.id, title: u.title, updatedAt: u.updatedAt };
        }
      }
    }
    if (mostRecent) {
      activeUnit = { id: mostRecent.id, title: mostRecent.title };
    }
  }

  // Audit the cross-role view. No-op in demo.
  await audit({
    viewer,
    event: "CROSS_ROLE_VIEW",
    subjectId: childId,
    payload: { route: `/parent/children/${childId}` }
  });

  if (!header) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/parent"
            className="text-sm text-ink-muted underline-offset-2 hover:underline"
          >
            ← All children
          </Link>
          <h1 className="font-serif text-3xl font-bold text-ink">{header.name}</h1>
          <p className="text-sm text-ink-soft">
            Grade {header.gradeLevel} · Primary learning style{" "}
            <strong className="text-ink">{header.primaryLearningStyle}</strong> ·
            Lexile {header.lexile || "—"}
          </p>
        </div>
        {activeUnit ? (
          <Link
            href={`/parent/children/${header.studentId}/material/${activeUnit.id}`}
            className="btn-primary text-sm"
          >
            Read the same personalized material {header.name} is reading
          </Link>
        ) : null}
      </header>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Grades over time</h2>
        <p className="text-sm text-ink-soft">
          Trend per course. Pulled from real submissions.
        </p>
        <div className="mt-4">
          {series.length > 0 ? (
            <GradeTrendChart series={series} />
          ) : (
            <p className="text-sm text-ink-muted">No graded work yet.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-ink">Mastery by topic</h2>
          {mastery.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No mastery records yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {mastery.map((m) => (
                <li key={m.topic}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{m.topic}</span>
                    <span className="text-ink-soft">
                      {pct(m.mastery)} <span aria-hidden>{trendArrow(m.trend)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-paper-soft">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        m.mastery >= 0.7
                          ? "bg-signal-ok"
                          : m.mastery >= 0.45
                            ? "bg-signal-warn"
                            : "bg-signal-alert"
                      )}
                      style={{ width: `${Math.round(Math.max(0, Math.min(1, m.mastery)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-ink">Flags</h2>
          {flags.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              No flags right now. Solid week.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {flags.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={severityClass(f.severity)}>
                    {f.severity === "alert"
                      ? "Alert"
                      : f.severity === "warn"
                        ? "Watch"
                        : "Note"}
                  </span>
                  <p className="text-sm text-ink-soft">{f.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Recent submissions</h2>
            <p className="text-sm text-ink-soft">Up to the last five.</p>
          </div>
        </div>
        {submissions.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Nothing submitted yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-paper-soft">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{s.unitTitle}</p>
                  <p className="text-xs text-ink-muted">
                    {s.submittedAt
                      ? `Submitted ${formatDate(s.submittedAt)}`
                      : "Not yet submitted"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusBadge(s.status)}>{s.status}</span>
                  <span className="text-ink-soft">
                    {s.scoreFinal !== null ? `${s.scoreFinal}%` : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {DEMO_UNITS.length > 0 && viewer.kind === "demo" ? (
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-ink">Active units</h2>
          <p className="text-sm text-ink-soft">
            Read the same teaching material your child is reading.
          </p>
          <ul className="mt-3 space-y-2">
            {DEMO_UNITS.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-ink">{u.title}</span>
                <Link
                  href={`/parent/children/${header.studentId}/material/${u.id}`}
                  className="btn-outline text-sm"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
