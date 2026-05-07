// Single submission view. Renders the student's answer, the rubric, and
// the SubmissionGrader (client) for AI draft + send-back.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { SubmissionGrader } from "./SubmissionGrader";

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
            return {
              name: typeof cc.name === "string" ? cc.name : "",
              weight: typeof cc.weight === "number" ? cc.weight : 0,
              description:
                typeof cc.description === "string" ? cc.description : ""
            };
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

export default async function TeacherSubmissionDetailPage({
  params
}: {
  params: { id: string };
}) {
  const viewer = await requireRole("TEACHER");
  const submissionId = params.id;

  if (viewer.kind === "demo") {
    // Demo has no submissions. Show a friendly empty state.
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Submission
          </h1>
          <p className="text-ink-soft">
            Demo mode has no submissions to grade. Switch to a real account
            to see the full grader.
          </p>
        </header>
        <Link href="/teacher/submissions" className="btn-outline text-sm">
          ← Back to queue
        </Link>
      </div>
    );
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: viewer.userId }
  });
  if (!teacher) notFound();

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: { include: { user: true } },
      unit: {
        include: {
          classroom: true,
          assignment: true
        }
      }
    }
  });
  if (!sub || sub.unit.classroom.teacherId !== teacher.id) notFound();

  const studentName = sub.student.user.name ?? sub.student.user.email;
  const rubric = sub.unit.assignment
    ? parseRubric(sub.unit.assignment.rubricJson)
    : null;
  const pointsTotal = sub.unit.assignment?.pointsTotal ?? 100;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Submission · {sub.unit.title}
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            {studentName}
          </h1>
          <p className="text-ink-soft">
            {sub.submittedAt
              ? `Submitted ${formatDate(sub.submittedAt)}`
              : "Not submitted yet"}{" "}
            · Status: <span className="badge-ok">{sub.status}</span>
          </p>
        </div>
        <Link href="/teacher/submissions" className="btn-ghost text-sm">
          ← Back to queue
        </Link>
      </header>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Student answer</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-paper-soft bg-paper p-4 text-sm text-ink">
          {sub.bodyText}
        </pre>
      </section>

      {sub.unit.assignment ? (
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-ink">Assignment + rubric</h2>
          <div
            className="prose-limud mt-3 max-w-none"
            dangerouslySetInnerHTML={{ __html: sub.unit.assignment.bodyHtml }}
          />
          {rubric ? (
            <ul className="mt-3 space-y-2 text-sm">
              {rubric.criteria.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-paper-soft p-3"
                >
                  <div>
                    <div className="font-medium text-ink">{c.name}</div>
                    <div className="text-ink-soft">{c.description}</div>
                  </div>
                  <span className="badge-ok shrink-0">{c.weight}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Rubric is not parseable JSON.
            </p>
          )}
        </section>
      ) : null}

      <SubmissionGrader
        submissionId={sub.id}
        pointsTotal={pointsTotal}
        initialFeedback={sub.feedbackFinal ?? sub.feedbackDraft ?? ""}
        initialScore={sub.scoreFinal ?? sub.scoreAuto}
        initialOffline={sub.feedbackOffline}
      />
    </div>
  );
}
