"use client";

// Limud tutor chat. Socratic by default; toggle to Direct.
// Transcript is in component state — DB persistence is intentionally
// out of scope for this iteration.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AIOfflineBadge } from "@/components/AIOfflineBadge";
import type { TutorMessage } from "@/lib/types";

type Mode = "SOCRATIC" | "DIRECT";

type ChatMessage = TutorMessage & {
  // Per-message offline flag so the badge sticks next to a tutor reply
  // that came back offline.
  offline?: boolean;
};

type TutorApiResponse = {
  data: string;
  offline: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

export default function TutorPage() {
  const params = useSearchParams();
  const unitId = params.get("unitId") ?? undefined;
  const [mode, setMode] = useState<Mode>("SOCRATIC");
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  async function send(): Promise<void> {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    const studentMsg: ChatMessage = { role: "student", content: text, ts: nowIso() };
    const next: ChatMessage[] = [...transcript, studentMsg];
    setTranscript(next);
    setDraft("");
    setPending(true);
    try {
      const res = await fetch("/api/student/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          transcript: next.map((m) => ({ role: m.role, content: m.content, ts: m.ts })),
          unitId
        })
      });
      if (!res.ok) {
        setError(`Tutor request failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as TutorApiResponse;
      const tutorMsg: ChatMessage = {
        role: "tutor",
        content: json.data,
        ts: nowIso(),
        offline: json.offline
      };
      setTranscript((cur) => [...cur, tutorMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Tutor</h1>
          <p className="text-ink-soft">
            Patient, Socratic by default. Switch to Direct mode if you want
            the worked answer.
            {unitId ? (
              <span className="ml-2 text-xs text-ink-muted">
                (linked to a unit)
              </span>
            ) : null}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Tutor mode"
          className="inline-flex rounded-lg border border-paper-soft bg-white p-1 text-sm"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === "SOCRATIC"}
            onClick={() => setMode("SOCRATIC")}
            className={
              "rounded-md px-3 py-1.5 " +
              (mode === "SOCRATIC" ? "bg-brand-600 text-white" : "text-ink hover:bg-paper-soft")
            }
          >
            Socratic
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "DIRECT"}
            onClick={() => setMode("DIRECT")}
            className={
              "rounded-md px-3 py-1.5 " +
              (mode === "DIRECT" ? "bg-brand-600 text-white" : "text-ink hover:bg-paper-soft")
            }
          >
            Direct
          </button>
        </div>
      </header>

      <section className="card flex flex-col">
        <div
          ref={scrollRef}
          className="max-h-[60vh] min-h-[20rem] flex-1 space-y-3 overflow-y-auto p-5"
        >
          {transcript.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Ask a question to start. Try: "I'm stuck on why the Third
              Estate was so angry — can you walk me through it?"
            </p>
          ) : null}
          {transcript.map((m, i) => {
            const isStudent = m.role === "student";
            return (
              <div
                key={`${m.ts}-${i}`}
                className={"flex " + (isStudent ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm " +
                    (isStudent
                      ? "bg-brand-600 text-white"
                      : "border border-paper-soft bg-paper text-ink")
                  }
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {!isStudent && m.offline ? (
                    <div className="mt-2">
                      <AIOfflineBadge />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-lg border border-paper-soft bg-paper px-3 py-2 text-sm text-ink-muted">
                tutor is thinking…
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-paper-soft p-3">
          {error ? (
            <div className="mb-2 text-xs text-signal-alert">{error}</div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              className="textarea min-h-[3.5rem] flex-1"
              placeholder="Type your question. ⌘/Ctrl + Enter to send."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={pending}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => void send()}
              disabled={pending || draft.trim().length === 0}
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
