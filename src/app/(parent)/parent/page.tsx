// Parent dashboard — one card per linked child.
// Shows: name, grade, current overall grade trend, top concern (highest
// severity flag), CTA buttons.
// Demo: only Maya is linked to Mr. Chen (per DEMO_PARENT.childIds).
// Real: read ParentChild table for the linked Parent.

import Link from "next/link";
import { Empty } from "@/components/Empty";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { DEMO_PARENT, findDemoStudent } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

type ChildCardData = {
  studentId: string;
  name: string;
  gradeLevel: number;
  // Average current grade across courses (0-100 or null when unknown).
  overallGrade: number | null;
  trend: "improving" | "steady" | "slipping" | "unknown";
  topConcern: { severity: "info" | "warn" | "alert"; text: string } | null;
};

function severityClass(severity: "info" | "warn" | "alert"): string {
  if (severity === "alert") return "badge-alert";
  if (severity === "warn") return "badge-warn";
  return "badge-ok";
}

function severityRank(severity: "info" | "warn" | "alert"): number {
  if (severity === "alert") return 3;
  if (severity === "warn") return 2;
  return 1;
}

export default async function ParentChildrenPage() {
  const viewer = await requireRole("PARENT");

  const cards: ChildCardData[] = [];

  if (viewer.kind === "demo") {
    for (const id of DEMO_PARENT.childIds) {
      const s = findDemoStudent(id);
      if (!s) continue;
      const total = s.grades.reduce((a, g) => a + g.grade, 0);
      const avg = s.grades.length > 0 ? Math.round(total / s.grades.length) : null;
      // Aggregate trend: majority improving > steady > slipping.
      const counts: Record<"improving" | "steady" | "slipping", number> = {
        improving: 0,
        steady: 0,
        slipping: 0
      };
      for (const g of s.grades) counts[g.trend] += 1;
      let trend: ChildCardData["trend"] = "unknown";
      if (s.grades.length > 0) {
        if (counts.improving >= counts.steady && counts.improving >= counts.slipping)
          trend = "improving";
        else if (counts.slipping >= counts.steady) trend = "slipping";
        else trend = "steady";
      }
      const topFlag = s.flags
        .slice()
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0] ?? null;
      cards.push({
        studentId: s.studentId,
        name: s.name,
        gradeLevel: s.gradeLevel,
        overallGrade: avg,
        trend,
        topConcern: topFlag ? { severity: topFlag.severity, text: topFlag.text } : null
      });
    }
  } else {
    const parent = await prisma.parent.findUnique({
      where: { userId: viewer.userId },
      include: {
        children: {
          include: {
            student: {
              include: {
                user: true,
                submissions: true,
                mastery: { include: { node: true } }
              }
            }
          }
        }
      }
    });
    if (parent) {
      for (const link of parent.children) {
        const s = link.student;
        const grades = s.submissions
          .filter((sb) => sb.scoreFinal !== null)
          .map((sb) => sb.scoreFinal as number);
        const avg = grades.length > 0
          ? Math.round(grades.reduce((a, n) => a + n, 0) / grades.length)
          : null;
        // Real-world trend heuristic: compare last 3 grades to previous 3.
        let trend: ChildCardData["trend"] = "unknown";
        if (grades.length >= 2) {
          const last = grades[grades.length - 1] ?? 0;
          const first = grades[0] ?? 0;
          if (last - first > 3) trend = "improving";
          else if (first - last > 3) trend = "slipping";
          else trend = "steady";
        }
        const lowestMastery = s.mastery
          .slice()
          .sort((a, b) => a.mastery - b.mastery)[0];
        let topConcern: ChildCardData["topConcern"] = null;
        if (lowestMastery && lowestMastery.mastery < 0.5) {
          topConcern = {
            severity: lowestMastery.mastery < 0.3 ? "alert" : "warn",
            text: `Low mastery on "${lowestMastery.node.topic}" (${Math.round(
              lowestMastery.mastery * 100
            )}%).`
          };
        }
        cards.push({
          studentId: s.id,
          name: s.user.name ?? s.user.email,
          gradeLevel: s.gradeLevel,
          overallGrade: avg,
          trend,
          topConcern
        });
      }
    }
  }

  // Aggregate cross-role read of every linked child's grades + mastery.
  // Audit once per dashboard load. The helper no-ops in demo mode.
  if (cards.length > 0) {
    await audit({
      viewer,
      event: "CROSS_ROLE_VIEW",
      payload: {
        surface: "parent-dashboard",
        childIds: cards.map((c) => c.studentId)
      }
    });
  }

  const trendLabel: Record<ChildCardData["trend"], string> = {
    improving: "Trending up",
    steady: "Steady",
    slipping: "Slipping",
    unknown: "No data yet"
  };
  const trendBadge: Record<ChildCardData["trend"], string> = {
    improving: "badge-ok",
    steady: "badge",
    slipping: "badge-warn",
    unknown: "badge"
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-ink-muted">
          {viewer.name ? `Hi, ${viewer.name}.` : "Welcome."}
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Your children
        </h1>
        <p className="text-ink-soft">
          A snapshot for each linked child. Tap in to see full progress, or
          read the same personalized material your child is reading.
        </p>
      </header>

      {cards.length === 0 ? (
        <Empty
          title="No linked children yet"
          body="Link a child with their school invite code to see their progress."
          action={{ label: "Add a child", href: "/parent/register" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <article key={c.studentId} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{c.name}</h2>
                  <p className="text-sm text-ink-muted">Grade {c.gradeLevel}</p>
                </div>
                <span className={cn(trendBadge[c.trend])}>
                  {trendLabel[c.trend]}
                </span>
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Overall grade
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-ink">
                    {c.overallGrade !== null ? `${c.overallGrade}%` : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Top concern
                </div>
                {c.topConcern ? (
                  <div className="mt-1 flex items-start gap-2">
                    <span className={severityClass(c.topConcern.severity)}>
                      {c.topConcern.severity === "alert"
                        ? "Alert"
                        : c.topConcern.severity === "warn"
                          ? "Watch"
                          : "Note"}
                    </span>
                    <p className="text-sm text-ink-soft">{c.topConcern.text}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">
                    No flags right now. Solid week.
                  </p>
                )}
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/parent/children/${c.studentId}`}
                  className="btn-primary text-sm"
                >
                  See progress
                </Link>
                <Link
                  href={`/parent/children/${c.studentId}`}
                  className="btn-outline text-sm"
                >
                  Read what they&apos;re reading
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
