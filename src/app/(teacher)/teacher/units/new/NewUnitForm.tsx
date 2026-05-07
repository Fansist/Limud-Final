"use client";

// THE TWO-UPLOAD FORM. Uniform Assignment on the left, source Material
// on the right. Submitting calls /api/teacher/units (real) or, in demo
// mode, surfaces a banner and redirects back to the demo classroom.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  classroomId: string;
  isDemo: boolean;
  defaultRubricJson: string;
  defaultObjectives: string;
  defaultDueAt: string;
};

export function NewUnitForm({
  classroomId,
  isDemo,
  defaultRubricJson,
  defaultObjectives,
  defaultDueAt
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);

  // Form state.
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>(defaultDueAt);
  const [bodyHtml, setBodyHtml] = useState<string>(
    "<p>Question 1: ...</p>\n<p>Question 2: ...</p>"
  );
  const [rubricJson, setRubricJson] = useState<string>(defaultRubricJson);
  const [pointsTotal, setPointsTotal] = useState<string>("100");

  const [sourceHtml, setSourceHtml] = useState<string>(
    "<h2>Topic</h2>\n<p>Source content for the AI to personalize per student...</p>"
  );
  const [sourceLexile, setSourceLexile] = useState<string>("1000");
  const [objectives, setObjectives] = useState<string>(defaultObjectives);

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setErrorMsg(null);
    setDemoBanner(null);

    if (isDemo) {
      setDemoBanner(
        "Demo mode: this would create the unit — try it on a real account. Returning to the classroom..."
      );
      startTransition(() => {
        setTimeout(() => {
          router.push(`/teacher/classrooms/${classroomId}`);
        }, 1200);
      });
      return;
    }

    // Validate rubric JSON early on the client.
    try {
      JSON.parse(rubricJson);
    } catch {
      setErrorMsg("Rubric is not valid JSON. Fix the JSON and try again.");
      return;
    }

    const objectivesArray = objectives
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (objectivesArray.length === 0) {
      setErrorMsg("Add at least one learning objective.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/teacher/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classroomId,
            title: title.trim(),
            description: description.trim() || null,
            dueAt: dueAt ? new Date(dueAt).toISOString() : null,
            assignment: {
              bodyHtml,
              rubricJson,
              pointsTotal: Number(pointsTotal) || 100
            },
            material: {
              sourceHtml,
              sourceLexile: Number(sourceLexile) || 0,
              objectives: objectivesArray
            }
          })
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorMsg(body.error ?? `Save failed (${res.status})`);
          return;
        }
        const body = (await res.json()) as { id: string };
        router.push(`/teacher/units/${body.id}`);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Unexpected error saving unit"
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="card border-l-4 border-l-brand-500 p-4">
        <p className="text-sm text-ink">
          <strong>Same Assignment for every student. Different Material
          for each one.</strong>{" "}
          Personalization happens automatically.
        </p>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold text-ink">Unit basics</h2>
        <div>
          <label className="label" htmlFor="title">
            Unit title
          </label>
          <input
            id="title"
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. The French Revolution (1789–1799)"
          />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description (shown to students)
          </label>
          <input
            id="description"
            className="input mt-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional one-line context"
          />
        </div>
        <div>
          <label className="label" htmlFor="dueAt">
            Due date
          </label>
          <input
            id="dueAt"
            type="datetime-local"
            className="input mt-1"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3 border-t-4 border-t-brand-500 p-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Side A
            </p>
            <h2 className="text-lg font-semibold text-ink">
              Assignment <span className="text-ink-muted">(uniform)</span>
            </h2>
            <p className="text-sm text-ink-soft">
              Same questions, same rubric, same points for every student.
              Personalization NEVER touches this side.
            </p>
          </header>
          <div>
            <label className="label" htmlFor="bodyHtml">
              Assignment body (HTML allowed)
            </label>
            <textarea
              id="bodyHtml"
              className="textarea mt-1 font-mono text-xs"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              required
              rows={10}
            />
          </div>
          <div>
            <label className="label" htmlFor="rubricJson">
              Rubric (JSON)
            </label>
            <textarea
              id="rubricJson"
              className="textarea mt-1 font-mono text-xs"
              value={rubricJson}
              onChange={(e) => setRubricJson(e.target.value)}
              required
              rows={10}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Shape: <code>{"{ \"criteria\": [{ name, weight, description }] }"}</code>
            </p>
          </div>
          <div>
            <label className="label" htmlFor="pointsTotal">
              Points total
            </label>
            <input
              id="pointsTotal"
              type="number"
              min={1}
              className="input mt-1"
              value={pointsTotal}
              onChange={(e) => setPointsTotal(e.target.value)}
              required
            />
          </div>
        </section>

        <section className="card space-y-3 border-t-4 border-t-accent-warm p-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-warm">
              Side B
            </p>
            <h2 className="text-lg font-semibold text-ink">
              Material <span className="text-ink-muted">(auto-personalized)</span>
            </h2>
            <p className="text-sm text-ink-soft">
              The source content. Limud rewrites it for each student, preserving
              every learning objective.
            </p>
          </header>
          <div>
            <label className="label" htmlFor="sourceHtml">
              Source HTML
            </label>
            <textarea
              id="sourceHtml"
              className="textarea mt-1 font-mono text-xs"
              value={sourceHtml}
              onChange={(e) => setSourceHtml(e.target.value)}
              required
              rows={10}
            />
          </div>
          <div>
            <label className="label" htmlFor="sourceLexile">
              Source Lexile
            </label>
            <input
              id="sourceLexile"
              type="number"
              min={0}
              className="input mt-1"
              value={sourceLexile}
              onChange={(e) => setSourceLexile(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="objectives">
              Learning objectives (one per line)
            </label>
            <textarea
              id="objectives"
              className="textarea mt-1"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              required
              rows={8}
              placeholder={"Identify ...\nExplain ...\nDefine ..."}
            />
          </div>
        </section>
      </div>

      {demoBanner ? (
        <div className="card border-l-4 border-l-signal-warn p-4 text-sm">
          {demoBanner}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="card border-l-4 border-l-signal-alert p-4 text-sm text-signal-alert">
          {errorMsg}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Saving..." : "Save unit"}
        </button>
      </div>
    </form>
  );
}
