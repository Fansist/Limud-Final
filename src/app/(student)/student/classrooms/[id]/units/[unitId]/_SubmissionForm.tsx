"use client";

// Inline assignment response form. Saves a draft or submits.

import { useState, useTransition } from "react";

type Props = {
  unitId: string;
  initialDraft?: string;
};

type Result = { ok: true; id: string } | { ok: false; error: string };

export function SubmissionForm({ unitId, initialDraft }: Props) {
  const [body, setBody] = useState(initialDraft ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send(action: "draft" | "submit"): void {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/student/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId, bodyText: body, action })
        });
        const json = (await res.json()) as Result;
        if (!res.ok || ("ok" in json && json.ok === false)) {
          setError("error" in json ? json.error : `Server returned ${res.status}`);
          return;
        }
        setMessage(action === "submit" ? "Submitted." : "Draft saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <label htmlFor="response" className="label">
        Your response
      </label>
      <textarea
        id="response"
        className="textarea"
        placeholder="Write your answers here. You can save a draft and come back to it."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-outline"
          onClick={() => send("draft")}
          disabled={pending || body.trim().length === 0}
        >
          Save draft
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => send("submit")}
          disabled={pending || body.trim().length === 0}
        >
          Submit
        </button>
        {pending ? <span className="text-xs text-ink-muted">working…</span> : null}
        {message ? <span className="text-xs text-signal-ok">{message}</span> : null}
        {error ? <span className="text-xs text-signal-alert">{error}</span> : null}
      </div>
    </div>
  );
}
