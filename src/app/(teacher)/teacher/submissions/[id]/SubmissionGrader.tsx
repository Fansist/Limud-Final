"use client";

// Client controller for the submission view: pulls an AI draft, lets the
// teacher edit, then PUTs the final feedback + score.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AIOfflineBadge } from "@/components/AIOfflineBadge";

type Props = {
  submissionId: string;
  pointsTotal: number;
  initialFeedback: string;
  initialScore: number | null;
  initialOffline: boolean;
};

export function SubmissionGrader({
  submissionId,
  pointsTotal,
  initialFeedback,
  initialScore,
  initialOffline
}: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>(initialFeedback);
  const [score, setScore] = useState<string>(
    initialScore === null ? "" : String(initialScore)
  );
  const [offline, setOffline] = useState<boolean>(initialOffline);
  const [drafting, startDraft] = useTransition();
  const [saving, startSave] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function onDraft(): void {
    setErrorMsg(null);
    setOkMsg(null);
    startDraft(async () => {
      try {
        const res = await fetch("/api/teacher/feedback/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId })
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorMsg(body.error ?? `Draft failed (${res.status})`);
          return;
        }
        const body = (await res.json()) as { data: string; offline: boolean };
        setFeedback(body.data);
        setOffline(body.offline);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Unexpected error drafting"
        );
      }
    });
  }

  function onSend(): void {
    setErrorMsg(null);
    setOkMsg(null);
    const numericScore = score === "" ? null : Number(score);
    if (numericScore === null || Number.isNaN(numericScore)) {
      setErrorMsg("Score is required (a number).");
      return;
    }
    if (numericScore < 0 || numericScore > pointsTotal) {
      setErrorMsg(`Score must be between 0 and ${pointsTotal}.`);
      return;
    }
    if (feedback.trim().length === 0) {
      setErrorMsg("Feedback can't be empty.");
      return;
    }
    startSave(async () => {
      try {
        const res = await fetch(`/api/teacher/submissions/${submissionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreFinal: numericScore,
            feedbackFinal: feedback
          })
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorMsg(body.error ?? `Send failed (${res.status})`);
          return;
        }
        setOkMsg("Sent back to student.");
        router.refresh();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Unexpected error sending"
        );
      }
    });
  }

  return (
    <section className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Feedback</h2>
        <button
          type="button"
          className="btn-outline text-sm"
          onClick={onDraft}
          disabled={drafting}
        >
          {drafting ? "Drafting..." : "Draft AI feedback"}
        </button>
      </div>
      {offline ? <AIOfflineBadge /> : null}
      <textarea
        className="textarea"
        rows={8}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="The AI draft will appear here. You always edit before sending."
      />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="score">
            Score (out of {pointsTotal})
          </label>
          <input
            id="score"
            type="number"
            className="input mt-1 w-32"
            value={score}
            min={0}
            max={pointsTotal}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onSend}
          disabled={saving}
        >
          {saving ? "Sending..." : "Send back"}
        </button>
      </div>
      {errorMsg ? (
        <p className="text-sm text-signal-alert">{errorMsg}</p>
      ) : null}
      {okMsg ? <p className="text-sm text-signal-ok">{okMsg}</p> : null}
    </section>
  );
}
