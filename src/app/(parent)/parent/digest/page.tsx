// Weekly digest preview. Renders what would go in the email per child.
// Resend send is wired through /api/parent/digest/[childId] but if
// RESEND_API_KEY is unset the API truthfully returns sent: false and we
// surface "email sending isn't configured" — never a false positive.

import { Empty } from "@/components/Empty";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_PARENT,
  DEMO_UNITS,
  findDemoStudent
} from "@/lib/demo/data";
import { formatDate } from "@/lib/utils";
import { SendDigestButton } from "./SendDigestButton";

type Highlight = { kind: "win" | "concern" | "reading" | "deadline"; text: string };
type DigestChild = {
  studentId: string;
  name: string;
  highlights: Highlight[];
};

function weekRange(now: Date = new Date()): { start: Date; end: Date } {
  // Sunday-anchored week containing `now`.
  const day = now.getDay(); // 0 = Sun
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function highlightIcon(kind: Highlight["kind"]): string {
  if (kind === "win") return "✓";
  if (kind === "concern") return "!";
  if (kind === "reading") return "📖";
  return "•";
}

function highlightClass(kind: Highlight["kind"]): string {
  if (kind === "win") return "text-signal-ok";
  if (kind === "concern") return "text-signal-warn";
  return "text-ink-soft";
}

export default async function ParentDigestPage(): Promise<JSX.Element> {
  const viewer = await requireRole("PARENT");
  const range = weekRange();
  const rangeLabel = `${formatDate(range.start, { month: "short", day: "numeric" })} – ${formatDate(range.end, { month: "short", day: "numeric", year: "numeric" })}`;

  const children: DigestChild[] = [];

  if (viewer.kind === "demo") {
    for (const id of DEMO_PARENT.childIds) {
      const s = findDemoStudent(id);
      if (!s) continue;
      const highlights: Highlight[] = [];
      // Pick the topic with the strongest upward trend as a "win".
      const wins = s.masteryByTopic
        .filter((m) => m.trend === "up")
        .sort((a, b) => b.mastery - a.mastery);
      const win = wins[0];
      if (win) {
        highlights.push({
          kind: "win",
          text: `Improving on "${win.topic}" — now at ${Math.round(win.mastery * 100)}% mastery.`
        });
      }
      // Surface the highest-severity flag if any.
      const flag = s.flags
        .slice()
        .sort((a, b) => {
          const w = (sev: typeof a.severity): number =>
            sev === "alert" ? 3 : sev === "warn" ? 2 : 1;
          return w(b.severity) - w(a.severity);
        })[0];
      if (flag) {
        highlights.push({
          kind: flag.severity === "info" ? "win" : "concern",
          text: flag.text
        });
      }
      // What they read this week + next week's deadlines.
      const unit = DEMO_UNITS[0];
      if (unit) {
        highlights.push({
          kind: "reading",
          text: `Read "${unit.title}" — personalized for ${s.name}'s ${s.learningStyles[0] ?? "primary"} style.`
        });
        highlights.push({
          kind: "deadline",
          text: `Due ${formatDate(unit.dueAt)}: ${unit.title} assessment.`
        });
      }
      children.push({
        studentId: s.studentId,
        name: s.name,
        highlights
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
                mastery: { include: { node: true } },
                submissions: {
                  where: {
                    updatedAt: { gte: range.start, lte: range.end }
                  },
                  include: { unit: true },
                  orderBy: { updatedAt: "desc" }
                },
                enrollments: {
                  include: {
                    classroom: {
                      include: {
                        units: {
                          where: {
                            dueAt: { gte: range.end }
                          },
                          orderBy: { dueAt: "asc" },
                          take: 2
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (parent) {
      for (const link of parent.children) {
        const s = link.student;
        const highlights: Highlight[] = [];
        const topMastery = s.mastery
          .slice()
          .sort((a, b) => b.mastery - a.mastery)[0];
        if (topMastery) {
          highlights.push({
            kind: "win",
            text: `Strongest topic this week: "${topMastery.node.topic}" (${Math.round(topMastery.mastery * 100)}%).`
          });
        }
        const lowest = s.mastery
          .slice()
          .sort((a, b) => a.mastery - b.mastery)[0];
        if (lowest && lowest.mastery < 0.5) {
          highlights.push({
            kind: "concern",
            text: `Watch: "${lowest.node.topic}" at ${Math.round(lowest.mastery * 100)}% mastery.`
          });
        }
        const recent = s.submissions[0];
        if (recent) {
          highlights.push({
            kind: "reading",
            text: `Worked on "${recent.unit.title}" this week.`
          });
        }
        // Next week's deadlines from the union of classroom units.
        const upcoming: Array<{ title: string; dueAt: Date }> = [];
        for (const e of s.enrollments) {
          for (const u of e.classroom.units) {
            if (u.dueAt) upcoming.push({ title: u.title, dueAt: u.dueAt });
          }
        }
        upcoming
          .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
          .slice(0, 2)
          .forEach((u) => {
            highlights.push({
              kind: "deadline",
              text: `Due ${formatDate(u.dueAt)}: ${u.title}.`
            });
          });
        children.push({
          studentId: s.id,
          name: s.user.name ?? s.user.email,
          highlights
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-ink-muted">Weekly Digest</p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Week of {rangeLabel}
        </h1>
        <p className="text-ink-soft">
          A short, scannable update for each linked child. This is exactly
          what would land in your inbox if email is configured.
        </p>
      </header>

      {children.length === 0 ? (
        <Empty
          title="No linked children to summarize"
          body="Add a child to start receiving weekly digests."
          action={{ label: "Add a child", href: "/parent/register" }}
        />
      ) : (
        <div className="space-y-4">
          {children.map((c) => (
            <article key={c.studentId} className="card space-y-4 p-5">
              <header className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">{c.name}</h2>
                <span className="text-xs text-ink-muted">
                  {c.highlights.length} highlight
                  {c.highlights.length === 1 ? "" : "s"}
                </span>
              </header>
              {c.highlights.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Quiet week. No major movement to call out.
                </p>
              ) : (
                <ul className="space-y-2">
                  {c.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        aria-hidden
                        className={`pt-0.5 font-semibold ${highlightClass(h.kind)}`}
                      >
                        {highlightIcon(h.kind)}
                      </span>
                      <span className="text-ink">{h.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-paper-soft pt-3">
                <SendDigestButton childId={c.studentId} childName={c.name} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
