// Unit detail. Side-by-side Assignment (uniform) and Material (source).
// Roster of "preview as <Name>" links and the submissions list.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  DEMO_STUDENTS,
  findDemoUnit
} from "@/lib/demo/data";
import { formatDate } from "@/lib/utils";

type AssignmentView = {
  bodyHtml: string;
  rubricJson: string;
  pointsTotal: number;
};
type MaterialView = {
  sourceHtml: string;
  sourceLexile: number;
  objectives: string[];
};
type StudentMini = { id: string; name: string; styles: string[] };
type SubmissionMini = {
  id: string;
  studentName: string;
  status: string;
  submittedAt: string | null;
};

function parseObjectives(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    /* noop */
  }
  return [];
}

function parseRubric(
  raw: string
): { criteria: Array<{ name: string; weight: number; description: string }> } | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { criteria?: unknown }).criteria)
    ) {
      const criteria = (parsed as { criteria: unknown[] }).criteria
        .map((c) => {
          if (
            c &&
            typeof c === "object" &&
            "name" in c &&
            "weight" in c &&
            "description" in c
          ) {
            const cc = c as Record<string, unknown>;
            const name = typeof cc.name === "string" ? cc.name : "";
            const weight = typeof cc.weight === "number" ? cc.weight : 0;
            const description =
              typeof cc.description === "string" ? cc.description : "";
            return { name, weight, description };
          }
          return null;
        })
        .filter(
          (
            v
          ): v is { name: string; weight: number; description: string } =>
            v !== null
        );
      return { criteria };
    }
  } catch {
    /* noop */
  }
  return null;
}

export default async function TeacherUnitDetailPage({
  params
}: {
  params: { id: string };
}) {
  const viewer = await requireRole("TEACHER");
  const unitId = params.id;

  let title = "";
  let description: string | null = null;
  let dueAt: string | null = null;
  let classroomId = "";
  let classroomName = "";
  let assignment: AssignmentView | null = null;
  let material: MaterialView | null = null;
  let students: StudentMini[] = [];
  let submissions: SubmissionMini[] = [];

  if (viewer.kind === "demo") {
    const u = findDemoUnit(unitId);
    if (!u) notFound();
    title = u.title;
    description = u.description;
    dueAt = u.dueAt;
    classroomId = u.classroomId;
    classroomName = DEMO_CLASSROOM.name;
    assignment = {
      bodyHtml: u.assignment.bodyHtml,
      rubricJson: JSON.stringify(
        { criteria: u.assignment.rubric },
        null,
        2
      ),
      pointsTotal: u.assignment.pointsTotal
    };
    material = {
      sourceHtml: u.material.sourceHtml,
      sourceLexile: u.material.sourceLexile,
      objectives: u.material.objectives
    };
    students = DEMO_STUDENTS.map((s) => ({
      id: s.studentId,
      name: s.name,
      styles: s.learningStyles
    }));
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) notFound();
    const u = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        classroom: {
          include: {
            enrollments: { include: { student: { include: { user: true } } } }
          }
        },
        assignment: true,
        material: true,
        submissions: {
          include: { student: { include: { user: true } } }
        }
      }
    });
    if (!u || u.classroom.teacherId !== teacher.id) notFound();
    title = u.title;
    description = u.description;
    dueAt = u.dueAt ? u.dueAt.toISOString() : null;
    classroomId = u.classroomId;
    classroomName = u.classroom.name;
    if (u.assignment) {
      assignment = {
        bodyHtml: u.assignment.bodyHtml,
        rubricJson: u.assignment.rubricJson,
        pointsTotal: u.assignment.pointsTotal
      };
    }
    if (u.material) {
      material = {
        sourceHtml: u.material.sourceHtml,
        sourceLexile: u.material.sourceLexile,
        objectives: parseObjectives(u.material.objectives)
      };
    }
    students = u.classroom.enrollments.map((e) => ({
      id: e.studentId,
      name: e.student.user.name ?? e.student.user.email,
      styles: e.student.learningStyles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    }));
    submissions = u.submissions.map((s) => ({
      id: s.id,
      studentName: s.student.user.name ?? s.student.user.email,
      status: s.status,
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null
    }));
  }

  const rubric = assignment ? parseRubric(assignment.rubricJson) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Unit · <Link href={`/teacher/classrooms/${classroomId}`} className="hover:underline">{classroomName}</Link>
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">{title}</h1>
          {description ? (
            <p className="text-ink-soft">{description}</p>
          ) : null}
          <p className="mt-1 text-sm text-ink-muted">
            {dueAt ? `Due ${formatDate(dueAt)}` : "No due date"}
          </p>
        </div>
        <Link
          href={`/teacher/classrooms/${classroomId}`}
          className="btn-ghost text-sm"
        >
          ← Back to classroom
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card border-t-4 border-t-brand-500 p-5">
          <header className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Side A
            </p>
            <h2 className="text-lg font-semibold text-ink">
              Assignment <span className="text-ink-muted">(uniform)</span>
            </h2>
            <p className="text-sm text-ink-soft">
              {assignment
                ? `${assignment.pointsTotal} points · same for every student`
                : "Not configured."}
            </p>
          </header>
          {assignment ? (
            <>
              <div
                className="prose-limud max-w-none"
                dangerouslySetInnerHTML={{ __html: assignment.bodyHtml }}
              />
              {rubric ? (
                <div className="mt-4 rounded-lg border border-paper-soft p-3">
                  <h3 className="text-sm font-semibold text-ink">Rubric</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {rubric.criteria.map((c, i) => (
                      <li key={i} className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-ink">{c.name}</div>
                          <div className="text-ink-soft">{c.description}</div>
                        </div>
                        <span className="badge-ok shrink-0">{c.weight}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink-muted">
                  Rubric is not parseable JSON. Edit the unit to fix.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-muted">No assignment attached.</p>
          )}
        </section>

        <section className="card border-t-4 border-t-accent-warm p-5">
          <header className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-warm">
              Side B
            </p>
            <h2 className="text-lg font-semibold text-ink">
              Material <span className="text-ink-muted">(source)</span>
            </h2>
            <p className="text-sm text-ink-soft">
              {material
                ? `Source Lexile ${material.sourceLexile || "—"}. Students see a personalized render of this.`
                : "Not configured."}
            </p>
          </header>
          {material ? (
            <>
              <div
                className="prose-limud max-w-none"
                dangerouslySetInnerHTML={{ __html: material.sourceHtml }}
              />
              {material.objectives.length > 0 ? (
                <div className="mt-4 rounded-lg border border-paper-soft p-3">
                  <h3 className="text-sm font-semibold text-ink">
                    Objectives (preserved in every render)
                  </h3>
                  <ol className="mt-2 ml-5 list-decimal space-y-1 text-sm text-ink-soft">
                    {material.objectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-muted">No material attached.</p>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">
          Preview personalization for…
        </h2>
        <p className="text-sm text-ink-soft">
          See exactly what each student will read. Same objectives, different presentation.
        </p>
        {students.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No students in this classroom yet.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-paper-soft p-3"
              >
                <div>
                  <div className="font-medium text-ink">{s.name}</div>
                  <div className="text-xs capitalize text-ink-muted">
                    {(s.styles[0] ?? "—").replace(/_/g, " ")}
                  </div>
                </div>
                <Link
                  href={`/teacher/units/${unitId}/preview/${s.id}`}
                  className="btn-outline text-sm"
                >
                  Preview as {s.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Submissions</h2>
        {submissions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No submissions yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-paper-soft">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <div className="font-medium text-ink">{s.studentName}</div>
                  <div className="text-xs text-ink-muted">
                    {s.submittedAt
                      ? `Submitted ${formatDate(s.submittedAt)}`
                      : "Not yet submitted"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge-ok">{s.status}</span>
                  <Link
                    href={`/teacher/submissions/${s.id}`}
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
