"use client";

// Single-page onboarding wizard for self-ed (homeschool) families. Asks
// for parent identity + a dynamic list of children. Submits to
// /api/self/bootstrap, which spins up a District { isSelfEd: true }, a
// Teacher row for the parent, a Classroom, and Student rows for each
// kid. Demo mode short-circuits with a friendly toast.

import { useState, useTransition } from "react";

type ChildRow = {
  id: string;
  name: string;
  gradeLevel: string;
};

type Props = {
  isDemo: boolean;
};

let nextId = 0;
function newId(): string {
  nextId += 1;
  return `c-${nextId}`;
}

function defaultRows(): ChildRow[] {
  return [
    { id: newId(), name: "", gradeLevel: "5" }
  ];
}

export function OnboardingForm({ isDemo }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [parentName, setParentName] = useState<string>("");
  const [parentEmail, setParentEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [classroomName, setClassroomName] = useState<string>(
    `Home — ${new Date().getFullYear()}`
  );
  const [children, setChildren] = useState<ChildRow[]>(() => defaultRows());

  function updateChild(id: string, patch: Partial<ChildRow>): void {
    setChildren((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addChild(): void {
    setChildren((rows) => [
      ...rows,
      { id: newId(), name: "", gradeLevel: "5" }
    ]);
  }

  function removeChild(id: string): void {
    setChildren((rows) =>
      rows.length === 1 ? rows : rows.filter((r) => r.id !== id)
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanedChildren = children
      .map((c) => ({
        name: c.name.trim(),
        gradeLevel: Number.parseInt(c.gradeLevel, 10)
      }))
      .filter((c) => c.name.length > 0 && Number.isFinite(c.gradeLevel));

    if (cleanedChildren.length === 0) {
      setError("Add at least one child with a name and grade.");
      return;
    }

    const body = {
      parent: {
        name: parentName.trim(),
        email: parentEmail.trim().toLowerCase(),
        password
      },
      classroomName: classroomName.trim() || `Home — ${new Date().getFullYear()}`,
      children: cleanedChildren
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/self/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          demo?: boolean;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          setError(data.error ?? `Bootstrap failed (${res.status})`);
          return;
        }
        if (data.demo) {
          setSuccess(
            "Demo mode: in production this would create your district of one. Nothing was persisted."
          );
          return;
        }
        setSuccess(
          "Your homeschool district is live. Sign in with the email + password you just used to start authoring units."
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unexpected error during bootstrap"
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold text-ink">You</h2>
        <p className="text-sm text-ink-soft">
          You are both the teacher and the parent inside your district of
          one. Use the email you'll sign in with.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="parentName">
              Your name
            </label>
            <input
              id="parentName"
              className="input mt-1"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. Alex Kim"
            />
          </div>
          <div>
            <label className="label" htmlFor="parentEmail">
              Email
            </label>
            <input
              id="parentEmail"
              type="email"
              className="input mt-1"
              required
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="you@home.example"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input mt-1"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="classroomName">
              Classroom name
            </label>
            <input
              id="classroomName"
              className="input mt-1"
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
              placeholder="Home — 2026"
            />
            <p className="mt-1 text-xs text-ink-muted">
              We'll create one classroom inside your district of one. You
              can rename it later.
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Your kids</h2>
            <p className="text-sm text-ink-soft">
              One row per learner. Add as many as you need.
            </p>
          </div>
          <button
            type="button"
            className="btn-outline text-sm"
            onClick={addChild}
          >
            + Add child
          </button>
        </header>
        <ul className="space-y-2">
          {children.map((c, i) => (
            <li
              key={c.id}
              className="grid items-end gap-3 rounded-lg border border-paper-soft p-3 md:grid-cols-[1fr_8rem_auto]"
            >
              <div>
                <label className="label" htmlFor={`name-${c.id}`}>
                  Child #{i + 1} name
                </label>
                <input
                  id={`name-${c.id}`}
                  className="input mt-1"
                  required
                  value={c.name}
                  onChange={(e) => updateChild(c.id, { name: e.target.value })}
                  placeholder="e.g. Sam"
                />
              </div>
              <div>
                <label className="label" htmlFor={`grade-${c.id}`}>
                  Grade
                </label>
                <input
                  id={`grade-${c.id}`}
                  type="number"
                  min={0}
                  max={12}
                  className="input mt-1"
                  required
                  value={c.gradeLevel}
                  onChange={(e) =>
                    updateChild(c.id, { gradeLevel: e.target.value })
                  }
                />
              </div>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => removeChild(c.id)}
                disabled={children.length === 1}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {isDemo ? (
        <div className="card border-l-4 border-l-signal-warn p-4 text-sm">
          You're in demo mode. Submitting will not persist anything — it
          will just confirm what would happen in production.
        </div>
      ) : null}

      {error ? (
        <div className="card border-l-4 border-l-signal-alert p-4 text-sm text-signal-alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="card border-l-4 border-l-signal-ok p-4 text-sm text-signal-ok">
          {success}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Setting up…" : "Create my district of one"}
        </button>
      </div>
    </form>
  );
}
