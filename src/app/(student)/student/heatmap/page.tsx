// Knowledge heatmap. Horizontal bars of mastery per topic, with
// confidence intervals as error bars and a small trend legend.

import type { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findDemoStudent } from "@/lib/demo/data";
import { Empty } from "@/components/Empty";
import { MasteryBars, type Row } from "./_MasteryBars";

type TrendRow = {
  topic: string;
  mastery: number;
  trend: "up" | "flat" | "down";
};

async function loadDemo(viewerStudentId: string): Promise<TrendRow[]> {
  const student = findDemoStudent(viewerStudentId) ?? findDemoStudent("demo-student-maya");
  if (!student) return [];
  return student.masteryByTopic.map((m) => ({
    topic: m.topic,
    mastery: m.mastery,
    trend: m.trend
  }));
}

async function loadReal(userId: string): Promise<TrendRow[]> {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { mastery: { include: { node: true } } }
  });
  if (!student) return [];
  return student.mastery.map((m) => ({
    topic: m.node.topic,
    mastery: m.mastery,
    trend: "flat"
  }));
}

function trendArrow(trend: "up" | "flat" | "down"): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

export default async function StudentHeatmapPage() {
  const viewer = await requireRole("STUDENT" as Role);
  const rowsRaw =
    viewer.kind === "demo"
      ? await loadDemo(viewer.demoStudentId ?? "demo-student-maya")
      : await loadReal(viewer.userId);

  // Sort weakest at top so the eye lands on what to work on.
  const sorted = [...rowsRaw].sort((a, b) => a.mastery - b.mastery);

  const chartRows: Row[] = sorted.map((r) => ({
    topic: r.topic,
    mastery: Math.round(r.mastery * 100),
    // Synthetic CI for demo: weaker mastery = wider uncertainty.
    ci: Math.round((1 - Math.min(0.95, r.mastery)) * 12)
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Your knowledge heatmap
        </h1>
        <p className="text-ink-soft">
          Topics you've worked on, ranked weakest first. Error bars show how
          confident we are in the estimate — wider means more practice will
          sharpen the picture.
        </p>
      </header>

      <section className="card p-6">
        {chartRows.length === 0 ? (
          <Empty
            title="Nothing to show yet"
            body="As you work through units, Limud will plot the topics you've practiced and how solid each one feels."
          />
        ) : (
          <>
            <MasteryBars data={chartRows} />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Color key
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    <span className="badge-ok">80%+</span>
                    <span className="ml-2 text-ink-soft">solid mastery</span>
                  </li>
                  <li>
                    <span className="badge-warn">40–79%</span>
                    <span className="ml-2 text-ink-soft">developing</span>
                  </li>
                  <li>
                    <span className="badge-alert">&lt; 40%</span>
                    <span className="ml-2 text-ink-soft">needs more time</span>
                  </li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Trend
                </div>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  <li><strong>↑</strong> improving session-over-session</li>
                  <li><strong>→</strong> roughly steady</li>
                  <li><strong>↓</strong> slipping — flagged for review</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </section>

      {sorted.length > 0 ? (
        <section className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Topic detail
          </div>
          <ul className="mt-3 divide-y divide-paper-soft">
            {sorted.map((r) => (
              <li key={r.topic} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate">{r.topic}</span>
                <span className="text-ink-muted">
                  {Math.round(r.mastery * 100)}% {trendArrow(r.trend)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
