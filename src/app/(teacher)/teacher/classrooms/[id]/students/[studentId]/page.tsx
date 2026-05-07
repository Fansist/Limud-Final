// Student knowledge view stub. Real surface lives in another coder's
// scope; this page exists so links from the roster don't 404 and so
// teachers see a meaningful preview.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  findDemoStudent
} from "@/lib/demo/data";
import { audit } from "@/lib/audit";

type StudentSnapshot = {
  name: string;
  gradeLevel: number;
  lexile: number;
  language: string;
  learningStyles: string[];
  interests: string[];
  flags: Array<{ severity: "info" | "warn" | "alert"; text: string }>;
};

export default async function TeacherStudentKnowledgePage({
  params
}: {
  params: { id: string; studentId: string };
}) {
  const viewer = await requireRole("TEACHER");
  const classroomId = params.id;
  const studentId = params.studentId;

  let snapshot: StudentSnapshot | null = null;

  if (viewer.kind === "demo") {
    if (classroomId !== DEMO_CLASSROOM.id) notFound();
    const s = findDemoStudent(studentId);
    if (!s) notFound();
    snapshot = {
      name: s.name,
      gradeLevel: s.gradeLevel,
      lexile: s.lexile,
      language: s.language,
      learningStyles: s.learningStyles,
      interests: s.interests,
      flags: s.flags
    };
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) notFound();
    const enrollment = await prisma.enrollment.findFirst({
      where: { classroomId, studentId, classroom: { teacherId: teacher.id } },
      include: { student: { include: { user: true } } }
    });
    if (!enrollment) notFound();
    const s = enrollment.student;
    snapshot = {
      name: s.user.name ?? s.user.email,
      gradeLevel: s.gradeLevel,
      lexile: s.lexile,
      language: s.language,
      learningStyles: s.learningStyles
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      interests: s.interests
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      flags: []
    };
    await audit({
      viewer,
      event: "CROSS_ROLE_VIEW",
      subjectId: studentId,
      payload: { classroomId, surface: "teacher-student-knowledge" }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Student knowledge view
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            {snapshot.name}
          </h1>
          <p className="text-ink-soft">
            Grade {snapshot.gradeLevel} · Lexile{" "}
            {snapshot.lexile > 0 ? snapshot.lexile : "—"} · Language{" "}
            {snapshot.language.toUpperCase()}
          </p>
        </div>
        <Link
          href={`/teacher/classrooms/${classroomId}`}
          className="btn-ghost text-sm"
        >
          ← Back to classroom
        </Link>
      </header>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Profile snapshot</h2>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-medium text-ink-soft">Learning styles</dt>
            <dd className="mt-1 capitalize text-ink">
              {snapshot.learningStyles.length > 0
                ? snapshot.learningStyles.join(", ").replace(/_/g, " ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-soft">Interests</dt>
            <dd className="mt-1 text-ink">
              {snapshot.interests.length > 0
                ? snapshot.interests.join(", ")
                : "—"}
            </dd>
          </div>
        </dl>
        {snapshot.flags.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {snapshot.flags.map((f, i) => (
              <li key={i} className="text-sm text-ink-soft">
                <span
                  className={
                    f.severity === "alert"
                      ? "badge-alert"
                      : f.severity === "warn"
                        ? "badge-warn"
                        : "badge-ok"
                  }
                >
                  {f.severity}
                </span>{" "}
                {f.text}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">
          Knowledge view (stub)
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          The full knowledge graph view, mastery deltas, and per-topic
          intervention log live in another surface that's still being built.
          From here you can preview any unit's personalization for{" "}
          {snapshot.name} via the unit page.
        </p>
      </section>
    </div>
  );
}
