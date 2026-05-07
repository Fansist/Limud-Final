// Classroom detail. Roster table + units list + "+ New unit" button.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty } from "@/components/Empty";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  DEMO_STUDENTS,
  DEMO_UNITS
} from "@/lib/demo/data";
import { formatDate } from "@/lib/utils";

type RosterRow = {
  studentId: string;
  name: string;
  gradeLevel: number;
  primaryStyle: string;
  lexile: number;
  masteryAvg: number | null;
};

type UnitRow = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  publishedAt: string | null;
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default async function TeacherClassroomDetailPage({
  params
}: {
  params: { id: string };
}) {
  const viewer = await requireRole("TEACHER");
  const classroomId = params.id;

  let classroomName = "";
  let subject = "";
  let gradeLevel = 0;
  const roster: RosterRow[] = [];
  const units: UnitRow[] = [];

  if (viewer.kind === "demo") {
    if (classroomId !== DEMO_CLASSROOM.id) notFound();
    classroomName = DEMO_CLASSROOM.name;
    subject = DEMO_CLASSROOM.subject;
    gradeLevel = DEMO_CLASSROOM.gradeLevel;
    for (const s of DEMO_STUDENTS) {
      roster.push({
        studentId: s.studentId,
        name: s.name,
        gradeLevel: s.gradeLevel,
        primaryStyle: s.learningStyles[0] ?? "—",
        lexile: s.lexile,
        masteryAvg: avg(s.masteryByTopic.map((m) => m.mastery))
      });
    }
    for (const u of DEMO_UNITS.filter((u) => u.classroomId === classroomId)) {
      units.push({
        id: u.id,
        title: u.title,
        description: u.description,
        dueAt: u.dueAt,
        publishedAt: u.publishedAt
      });
    }
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) notFound();
    const c = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: true,
                mastery: true
              }
            }
          }
        },
        units: true
      }
    });
    if (!c || c.teacherId !== teacher.id) notFound();
    classroomName = c.name;
    subject = c.subject;
    gradeLevel = c.gradeLevel;
    for (const e of c.enrollments) {
      const styleList = e.student.learningStyles.split(",").map((s) => s.trim()).filter(Boolean);
      roster.push({
        studentId: e.studentId,
        name: e.student.user.name ?? e.student.user.email,
        gradeLevel: e.student.gradeLevel,
        primaryStyle: styleList[0] ?? "—",
        lexile: e.student.lexile,
        masteryAvg: avg(e.student.mastery.map((m) => m.mastery))
      });
    }
    for (const u of c.units) {
      units.push({
        id: u.id,
        title: u.title,
        description: u.description,
        dueAt: u.dueAt ? u.dueAt.toISOString() : null,
        publishedAt: u.publishedAt ? u.publishedAt.toISOString() : null
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            {subject} · Grade {gradeLevel}
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            {classroomName}
          </h1>
          <p className="text-ink-soft">
            {roster.length} student{roster.length === 1 ? "" : "s"} ·{" "}
            {units.length} unit{units.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/teacher/classrooms"
          className="btn-ghost text-sm"
        >
          ← All classrooms
        </Link>
      </header>

      <section className="card overflow-hidden">
        <div className="border-b border-paper-soft p-4">
          <h2 className="text-lg font-semibold text-ink">Roster</h2>
          <p className="text-sm text-ink-soft">
            Click a student to open their knowledge view.
          </p>
        </div>
        {roster.length === 0 ? (
          <div className="p-6 text-sm text-ink-muted">
            No students enrolled yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Grade</th>
                  <th className="px-4 py-2">Primary style</th>
                  <th className="px-4 py-2">Lexile</th>
                  <th className="px-4 py-2">Course mastery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-soft">
                {roster.map((r) => (
                  <tr key={r.studentId}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/teacher/classrooms/${classroomId}/students/${r.studentId}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.gradeLevel}</td>
                    <td className="px-4 py-3 capitalize text-ink-soft">
                      {r.primaryStyle.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.lexile > 0 ? r.lexile : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.masteryAvg === null
                        ? "—"
                        : `${Math.round(r.masteryAvg * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-soft p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Units</h2>
            <p className="text-sm text-ink-soft">
              Each unit has one Assignment (uniform) + one Material (auto-personalized per student).
            </p>
          </div>
          <Link
            href={`/teacher/units/new?classroom=${classroomId}`}
            className="btn-primary text-sm"
          >
            + New unit
          </Link>
        </div>
        {units.length === 0 ? (
          <div className="p-6">
            <Empty
              title="No units yet"
              body="Create your first unit. You'll upload one Assignment (same for everyone) and one Material (auto-personalized per student)."
              action={{
                label: "Create unit",
                href: `/teacher/units/new?classroom=${classroomId}`
              }}
            />
          </div>
        ) : (
          <ul className="divide-y divide-paper-soft">
            {units.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/teacher/units/${u.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {u.title}
                  </Link>
                  {u.description ? (
                    <p className="line-clamp-1 text-sm text-ink-soft">
                      {u.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-sm text-ink-muted">
                  <span>
                    {u.publishedAt ? "Published" : "Draft"}
                  </span>
                  <span>·</span>
                  <span>
                    {u.dueAt ? `Due ${formatDate(u.dueAt)}` : "No due date"}
                  </span>
                  <Link
                    href={`/teacher/units/${u.id}`}
                    className="btn-ghost text-sm"
                  >
                    Open →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
