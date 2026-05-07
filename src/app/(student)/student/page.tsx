// "Today" — the AI Navigator dashboard. The student's home.
// Shows: welcome, "what should I work on", quick stats, mastery snapshot,
// tutor link.

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_UNITS, findDemoStudent } from "@/lib/demo/data";
import { formatRelative, pct } from "@/lib/utils";
import { Empty } from "@/components/Empty";

type MasteryView = { topic: string; mastery: number; trend: "up" | "flat" | "down" };
type GradeView = { course: string; grade: number; trend: "improving" | "steady" | "slipping" };
type Deadline = { id: string; title: string; dueAt: string | null; classroomId: string };

type DashboardData = {
  firstName: string;
  classCount: number;
  gradeTrendSummary: "improving" | "steady" | "slipping" | "unknown";
  upcomingDeadlines: Deadline[];
  topStrong: MasteryView[];
  topWeak: MasteryView[];
  ctaUnit: { id: string; classroomId: string; title: string } | null;
};

function summarizeGradeTrend(grades: GradeView[]): DashboardData["gradeTrendSummary"] {
  if (grades.length === 0) return "unknown";
  const score = grades.reduce((acc, g) => {
    if (g.trend === "improving") return acc + 1;
    if (g.trend === "slipping") return acc - 1;
    return acc;
  }, 0);
  if (score > 0) return "improving";
  if (score < 0) return "slipping";
  return "steady";
}

function trendArrow(trend: "up" | "flat" | "down"): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

function trendBadge(trend: DashboardData["gradeTrendSummary"]): string {
  if (trend === "improving") return "badge-ok";
  if (trend === "slipping") return "badge-alert";
  if (trend === "steady") return "badge-warn";
  return "badge-warn";
}

async function loadDemo(viewerStudentId: string): Promise<DashboardData> {
  const student = findDemoStudent(viewerStudentId) ?? findDemoStudent("demo-student-maya");
  const safe = student ?? findDemoStudent("demo-student-maya");
  // findDemoStudent always returns Maya for the default; this is just to
  // appease the type system without using non-null assertions.
  if (!safe) {
    return {
      firstName: "Student",
      classCount: 0,
      gradeTrendSummary: "unknown",
      upcomingDeadlines: [],
      topStrong: [],
      topWeak: [],
      ctaUnit: null
    };
  }
  const sortedByMastery = [...safe.masteryByTopic].sort((a, b) => b.mastery - a.mastery);
  const topStrong = sortedByMastery.slice(0, 3);
  const topWeak = [...safe.masteryByTopic].sort((a, b) => a.mastery - b.mastery).slice(0, 2);
  const ctaUnit = DEMO_UNITS[0]
    ? {
        id: DEMO_UNITS[0].id,
        classroomId: DEMO_UNITS[0].classroomId,
        title: DEMO_UNITS[0].title
      }
    : null;
  const upcomingDeadlines: Deadline[] = DEMO_UNITS.map((u) => ({
    id: u.id,
    title: u.title,
    dueAt: u.dueAt,
    classroomId: u.classroomId
  }));
  return {
    firstName: safe.name,
    classCount: 1,
    gradeTrendSummary: summarizeGradeTrend(safe.grades),
    upcomingDeadlines,
    topStrong,
    topWeak,
    ctaUnit
  };
}

async function loadReal(userId: string): Promise<DashboardData> {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: true,
      enrollments: {
        include: {
          classroom: { include: { units: true } }
        }
      },
      mastery: { include: { node: true } }
    }
  });
  if (!student) {
    return {
      firstName: "Student",
      classCount: 0,
      gradeTrendSummary: "unknown",
      upcomingDeadlines: [],
      topStrong: [],
      topWeak: [],
      ctaUnit: null
    };
  }
  const firstName = (student.user.name ?? student.user.email).split(/\s+/)[0] ?? "Student";
  const classCount = student.enrollments.length;
  const allUnits = student.enrollments.flatMap((e) =>
    e.classroom.units.map((u) => ({
      id: u.id,
      classroomId: e.classroomId,
      title: u.title,
      dueAt: u.dueAt ? u.dueAt.toISOString() : null
    }))
  );
  const upcomingDeadlines = allUnits
    .filter((u) => u.dueAt !== null)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 5);
  const masteryView: MasteryView[] = student.mastery.map((m) => ({
    topic: m.node.topic,
    mastery: m.mastery,
    trend: "flat"
  }));
  const sortedByMastery = [...masteryView].sort((a, b) => b.mastery - a.mastery);
  const topStrong = sortedByMastery.slice(0, 3);
  const topWeak = [...masteryView].sort((a, b) => a.mastery - b.mastery).slice(0, 2);
  const ctaUnit = allUnits[0]
    ? { id: allUnits[0].id, classroomId: allUnits[0].classroomId, title: allUnits[0].title }
    : null;
  return {
    firstName,
    classCount,
    gradeTrendSummary: "unknown",
    upcomingDeadlines,
    topStrong,
    topWeak,
    ctaUnit
  };
}

export default async function StudentDashboardPage() {
  const viewer = await requireRole("STUDENT");
  const data: DashboardData =
    viewer.kind === "demo"
      ? await loadDemo(viewer.demoStudentId ?? "demo-student-maya")
      : await loadReal(viewer.userId);

  // For demo we always have a CTA into the French Revolution unit.
  const demoCtaCopy =
    viewer.kind === "demo"
      ? "Finish reading the personalized French Revolution material, then start the unit assessment."
      : "Open your most recent unit and pick up where you left off.";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Hi, {data.firstName}.
        </h1>
        <p className="text-ink-soft">
          Quiet morning. One thing at a time — let's make today count.
        </p>
      </header>

      <section className="card p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          What should I work on right now?
        </div>
        <p className="mt-2 text-lg text-ink">{demoCtaCopy}</p>
        {data.ctaUnit ? (
          <Link
            href={`/student/classrooms/${data.ctaUnit.classroomId}/units/${data.ctaUnit.id}`}
            className="btn-primary mt-4"
          >
            Open {data.ctaUnit.title}
          </Link>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            No active unit yet. Your teacher hasn't published one.
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Classes
          </div>
          <div className="mt-2 text-3xl font-bold text-ink">{data.classCount}</div>
          <p className="mt-1 text-sm text-ink-soft">
            {data.classCount === 1 ? "Active classroom" : "Active classrooms"}
          </p>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Grade trend
          </div>
          <div className="mt-2">
            <span className={trendBadge(data.gradeTrendSummary)}>
              {data.gradeTrendSummary === "unknown"
                ? "no signal yet"
                : data.gradeTrendSummary}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Across all your courses.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Upcoming
          </div>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">Nothing due soon.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {data.upcomingDeadlines.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/student/classrooms/${d.classroomId}/units/${d.id}`}
                    className="truncate text-brand-600 hover:underline"
                  >
                    {d.title}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {formatRelative(d.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Mastery snapshot
        </div>
        {data.topStrong.length === 0 && data.topWeak.length === 0 ? (
          <div className="mt-4">
            <Empty
              title="No mastery data yet"
              body="Once you start submitting work, Limud will track which topics you're strongest in and which need more time."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Strongest right now</h3>
              {data.topStrong.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">No data yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.topStrong.map((m) => (
                    <li
                      key={m.topic}
                      className="flex items-center justify-between gap-3 rounded-md border border-paper-soft px-3 py-2"
                    >
                      <span className="truncate text-sm text-ink">{m.topic}</span>
                      <span className="badge-ok">
                        {pct(m.mastery)} {trendArrow(m.trend)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Needs more time</h3>
              {data.topWeak.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">No data yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.topWeak.map((m) => (
                    <li
                      key={m.topic}
                      className="flex items-center justify-between gap-3 rounded-md border border-paper-soft px-3 py-2"
                    >
                      <span className="truncate text-sm text-ink">{m.topic}</span>
                      <span className="badge-warn">
                        {pct(m.mastery)} {trendArrow(m.trend)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card flex flex-col items-start gap-3 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Need help?
          </div>
          <p className="mt-1 text-ink">
            The Limud tutor will walk you through anything in your units —
            patiently, without giving you the answer outright.
          </p>
        </div>
        <Link href="/student/tutor" className="btn-outline">
          Open AI tutor
        </Link>
      </section>

    </div>
  );
}
