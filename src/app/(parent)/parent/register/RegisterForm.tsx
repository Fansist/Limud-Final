"use client";

// Multi-child parent registration form. Public — no requireRole on the
// page itself. Lets a new parent create an account and link one or more
// children in a single flow. Each child requires an invite code from
// their school (no silent linking — see ROLES-GUIDE).
// In demo mode, submission shows a toast and redirects without any
// network or DB writes.

import { useRouter } from "next/navigation";
import { useState } from "react";

type ChildRow = { id: number; name: string; inviteCode: string };

type Props = {
  // True when the surface is in demo mode (we shortcut the submit).
  demo: boolean;
  // Pre-filled values from the demo viewer when present.
  defaultParentName: string;
  defaultParentEmail: string;
};

export function RegisterForm({
  demo,
  defaultParentName,
  defaultParentEmail
}: Props): JSX.Element {
  const router = useRouter();
  const [parentName, setParentName] = useState<string>(defaultParentName);
  const [parentEmail, setParentEmail] = useState<string>(defaultParentEmail);
  const [parentPassword, setParentPassword] = useState<string>("");
  const [children, setChildren] = useState<ChildRow[]>([
    { id: 1, name: "", inviteCode: "" }
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  function updateChild(id: number, patch: Partial<ChildRow>): void {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addChild(): void {
    setChildren((prev) => {
      const nextId = prev.reduce((m, c) => Math.max(m, c.id), 0) + 1;
      return [...prev, { id: nextId, name: "", inviteCode: "" }];
    });
  }

  function removeChild(id: number): void {
    setChildren((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      if (demo) {
        // Simulate the network round-trip in demo mode without any DB writes.
        await new Promise((r) => setTimeout(r, 250));
        setMessage({
          kind: "ok",
          text: "Demo mode: in production this would link the children. Heading back to your dashboard."
        });
        setTimeout(() => router.push("/parent"), 800);
        return;
      }
      const payload = {
        parent: {
          name: parentName.trim(),
          email: parentEmail.trim().toLowerCase(),
          password: parentPassword
        },
        children: children.map((c) => ({
          name: c.name.trim(),
          inviteCode: c.inviteCode.trim()
        }))
      };
      const res = await fetch("/api/parent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setMessage({
          kind: "error",
          text: data.error ?? "Registration failed. Please check the values and try again."
        });
        return;
      }
      setMessage({
        kind: "ok",
        text: "Account created. Redirecting to your dashboard."
      });
      setTimeout(() => router.push("/parent"), 800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Parent info</h2>
          <p className="text-sm text-ink-soft">
            We use this to sign you in and to address messages about your
            children.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="parent-name" className="label">
              Full name
            </label>
            <input
              id="parent-name"
              className="input mt-1"
              required
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              autoComplete="name"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="parent-email" className="label">
              Email
            </label>
            <input
              id="parent-email"
              type="email"
              className="input mt-1"
              required
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="parent-password" className="label">
              Password
            </label>
            <input
              id="parent-password"
              type="password"
              className="input mt-1"
              required={!demo}
              value={parentPassword}
              onChange={(e) => setParentPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              disabled={submitting}
              placeholder={demo ? "(not required in demo mode)" : ""}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Minimum 8 characters.
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Children</h2>
            <p className="text-sm text-ink-soft">
              Add one row per child. Each child needs an invite code from
              their school — Limud never silently links a parent to a
              student.
            </p>
          </div>
          <button
            type="button"
            className="btn-outline text-sm"
            onClick={addChild}
            disabled={submitting}
          >
            + Add another child
          </button>
        </div>
        <div className="space-y-3">
          {children.map((child, idx) => (
            <div
              key={child.id}
              className="rounded-lg border border-paper-soft bg-paper p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Child {idx + 1}
                </span>
                {children.length > 1 ? (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => removeChild(child.id)}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label
                    htmlFor={`child-name-${child.id}`}
                    className="label"
                  >
                    Child&apos;s name
                  </label>
                  <input
                    id={`child-name-${child.id}`}
                    className="input mt-1"
                    required
                    value={child.name}
                    onChange={(e) =>
                      updateChild(child.id, { name: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`child-code-${child.id}`}
                    className="label"
                  >
                    Invite code
                  </label>
                  <input
                    id={`child-code-${child.id}`}
                    className="input mt-1"
                    required
                    value={child.inviteCode}
                    onChange={(e) =>
                      updateChild(child.id, { inviteCode: e.target.value })
                    }
                    placeholder="Provided by your school"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div
          role="status"
          className={
            message.kind === "ok"
              ? "rounded-lg border border-signal-ok/40 bg-signal-ok/10 px-4 py-3 text-sm text-signal-ok"
              : "rounded-lg border border-signal-alert/40 bg-signal-alert/10 px-4 py-3 text-sm text-signal-alert"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="btn-primary text-sm"
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Create account & link children"}
        </button>
        <p className="text-xs text-ink-muted">
          By creating an account you agree to your school&apos;s data
          policies.
        </p>
      </div>
    </form>
  );
}
