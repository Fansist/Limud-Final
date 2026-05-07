// Self-ed (homeschool) dashboard. Hybrid view:
//   Left column (parent view) — every linked child + progress.
//   Right column (teacher view) — every active unit the parent has
//   authored inside their district-of-one.

import Link from "next/link";
import { requireRole, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Empty } from "@/components/Empty";
import { audit } from "@/lib/audit";
import {
  DEMO_CLASSROOM,
  DEMO_STUDENTS,
  DEMO_UNITS
} from "@/lib/demo/data";
import { formatDate, pct } from "@/lib/utils";

type ChildSummary = {
  studentId: string;
  name: string;
  gradeLevel: number;
  topMastery: { topic: string; mastery: number } | null;
  weakestMastery: { topic: string; mastery: number } | null;
  flags: number;
};

type UnitSummary = {
  unitId: string;
  classroomId: string;
  title: string;
  publishedAt: string | null;
  dueAt: string | null;
};

type SelfDashboard = {
  parentName: string;
  classroomName: string | null;
  children: ChildSummary[];
  units: UnitSummary[];
};

async function loadDemo(): Promise<SelfDashboard> {
  const children: ChildSummary[] = DEMO_STUDENTS.map((s) => {
    const sortedDesc = [...s.masteryByTopic].sort(
      (a, b) => b.mastery - a.mastery
    );
    const sortedAsc = [...s.masteryByTopic].sort(
      (a, b) => a.mastery - b.mastery
    );
    const top = sortedDesc[0] ?? null;
    const weak = sortedAsc[0] ?? null;
    return {
      studentId: s.studentId,
      name: s.name,
      gradeLevel: s.gradeLevel,
      topMastery: top ? { topic: top.topic, mastery: top.mastery } : null,
      weakestMastery: weak ? { topic: weak.topic, mastery: weak.mastery } : null,
      flags: s.flags.length
    };
  });
  const units: UnitSummary[] = DEMO_UNITS.map((u) => ({
    unitId: u.id,
    classroomId: u.classroomId,
    title: u.title,
    publishedAt: u.publishedAt,
    dueAt: u.dueAt
  }));
  return {
    parentName: "You",
    classroomName: DEMO_CLASSROOM.name,
    children,
    units
  };
}

async function loadReal(userId: string): Promise<SelfDashboard> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teacher: {
        include: {
          district: true,
          classrooms: {
            include: {
              units: true,
              enrollments: {
                include: {
                  student: {
                    include: {
                      user: true,
                      mastery: { include: { node: true } }
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
  if (!user?.teacher) {
    throw new AuthError(403, "Self-ed teacher record missing");
  }
  if (!user.teacher.district.isSelfEd) {
    throw new AuthError(403, "Not a self-ed district");
  }

  const children: ChildSummary[] = [];
  const units: UnitSummary[] = [];
  const seenStudent = new Set<string>();
  let classroomName: string | null = null;
  for (const c of user.teacher.classrooms) {
    classroomName = classroomName ?? c.name;
    for (const u of c.units) {
      units.push({
        unitId: u.id,
        classroomId: c.id,
        title: u.title,
        publishedAt: u.publishedAt ? u.publishedAt.toISOString() : null,
        dueAt: u.dueAt ? u.dueAt.toISOString() : null
      });
    }
    for (const e of c.enrollments) {
      if (seenStudent.has(e.studentId)) continue;
      seenStudent.add(e.studentId);
      const m = e.student.mastery;
      const sortedDesc = [...m].sort((a, b) => b.mastery - a.mastery);
      const sortedAsc = [...m].sort((a, b) => a.mastery - b.mastery);
      const top = sortedDesc[0] ?? null;
      const weak = sortedAsc[0] ?? null;
      children.push({
        studentId: e.studentId,
        name: e.student.user.name ?? e.student.user.email,
        gradeLevel: e.student.gradeLevel,
        topMastery: top
          ? { topic: top.node.topic, mastery: top.mastery }
          : null,
        weakestMastery: weak
          ? { topic: weak.node.topic, mastery: weak.mastery }
          : null,
        flags: 0
      });
    }
  }
  return {
    parentName: user.name ?? user.email,
    classroomName,
    children,
    units
  };
}

export default async function SelfDashboardPage() {
  const viewer = await requireRole("SELF_ED");
  const data: SelfDashboard =
    viewer.kind === "demo" ? await loadDemo() : await loadReal(viewer.userId);

  // SELF_ED reading their own kids' progress is still a cross-role view
  // (parent reading child data). One audit entry per dashboard load.
  if (viewer.kind === "user" && data.children.length > 0) {
    await audit({
      viewer,
      event: "CROSS_ROLE_VIEW",
      payload: {
        surface: "self-ed-dashboard",
        childCount: data.children.length
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Homeschool — your district of one
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Hi, {data.parentName.split(/\s+/)[0] ?? "you"}.
        </h1>
        <p className="text-ink-soft">
          You wear two hats here. On the left: your kids' progress. On the
          right: the units you've authored.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="border-b border-paper-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-warm">
              Parent view
            </p>
            <h2 className="text-lg font-semibold text-ink">Your kids</h2>
          </div>
          {data.children.length === 0 ? (
            <div className="p-6">
              <Empty
                title="No children yet"
                body="Run the onboarding wizard to register your kids and create your district of one."
                action={{ label: "Onboard now", href: "/self/onboarding" }}
              />
            </div>
          ) : (
            <ul className="divide-y divide-paper-soft">
              {data.children.map((child) => (
                <li key={child.studentId} className="space-y-2 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{child.name}</h3>
                      <p className="text-xs text-ink-muted">
                        Grade {child.gradeLevel}
                      </p>
                    </div>
                    {child.flags > 0 ? (
                      <span className="badge-warn">
                        {child.flags} flag{child.flags === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="badge-ok">on track</span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-paper-soft p-2">
                      <dt className="text-ink-muted">Strongest</dt>
                      <dd className="mt-1 font-medium text-ink">
                        {child.topMastery
                          ? `${child.topMastery.topic} · ${pct(
                              child.topMastery.mastery
                            )}`
                          : "no data"}
                      </dd>
                    </div>
                    <div className="rounded-md border border-paper-soft p-2">
                      <dt className="text-ink-muted">Needs more time</dt>
                      <dd className="mt-1 font-medium text-ink">
                        {child.weakestMastery
                          ? `${child.weakestMastery.topic} · ${pct(
                              child.weakestMastery.mastery
                            )}`
                          : "no data"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-soft p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Teacher view
              </p>
              <h2 className="text-lg font-semibold text-ink">
                Units you've authored
              </h2>
              {data.classroomName ? (
                <p className="text-xs text-ink-muted">
                  In {data.classroomName}
                </p>
              ) : null}
            </div>
            <Link href="/self/units/new" className="btn-primary text-sm">
              + New unit
            </Link>
          </div>
          {data.units.length === 0 ? (
            <div className="p-6">
              <Empty
                title="No units yet"
                body="Author your first unit. Same two-upload spine as the classroom: one Assignment + one Material."
                action={{ label: "Create unit", href: "/self/units/new" }}
              />
            </div>
          ) : (
            <ul className="divide-y divide-paper-soft">
              {data.units.map((u) => (
                <li
                  key={u.unitId}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-ink">{u.title}</span>
                    <p className="text-xs text-ink-muted">
                      {u.publishedAt ? "Published" : "Draft"} ·{" "}
                      {u.dueAt ? `due ${formatDate(u.dueAt)}` : "no due date"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card border-l-4 border-l-brand-500 p-4 text-sm">
        <strong>The spine is sacred:</strong> one Assignment (uniform), one
        Material (auto-personalized). Even your district of one runs on the
        same engine the rest of Limud uses.
      </section>
    </div>
  );
}
