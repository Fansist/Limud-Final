"use client";

// Timed practice shell. Hard-coded French Revolution MCQs for the demo.
// In real mode this would fetch a per-classroom question bank — left as
// a TODO comment.

import { useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  prompt: string;
  choices: Array<{ id: string; text: string }>;
  correct: string;
  rationale: string;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "Which estate paid almost all of pre-revolutionary France's taxes?",
    choices: [
      { id: "a", text: "First Estate (clergy)" },
      { id: "b", text: "Second Estate (nobility)" },
      { id: "c", text: "Third Estate (commoners)" },
      { id: "d", text: "All three estates equally" }
    ],
    correct: "c",
    rationale:
      "About 97% of the population was the Third Estate, and they carried nearly the entire tax burden."
  },
  {
    id: "q2",
    prompt: "What was the Tennis Court Oath?",
    choices: [
      { id: "a", text: "A treaty signed at Versailles in 1614" },
      { id: "b", text: "A pledge by the Third Estate not to disperse until France had a constitution" },
      { id: "c", text: "A trade agreement with England" },
      { id: "d", text: "A new tennis-themed sport invented during the Revolution" }
    ],
    correct: "b",
    rationale:
      "Locked out of the Estates-General chamber, the Third Estate gathered at a tennis court and swore not to disperse until France had a written constitution."
  },
  {
    id: "q3",
    prompt: "On what date did Parisians storm the Bastille?",
    choices: [
      { id: "a", text: "May 5, 1789" },
      { id: "b", text: "July 14, 1789" },
      { id: "c", text: "August 26, 1789" },
      { id: "d", text: "January 21, 1793" }
    ],
    correct: "b",
    rationale:
      "July 14, 1789 became the symbolic start of the Revolution. France still celebrates it as Bastille Day."
  },
  {
    id: "q4",
    prompt: "Who led the Committee of Public Safety during the Reign of Terror?",
    choices: [
      { id: "a", text: "Napoleon Bonaparte" },
      { id: "b", text: "King Louis XVI" },
      { id: "c", text: "Maximilien Robespierre" },
      { id: "d", text: "Georges Danton" }
    ],
    correct: "c",
    rationale:
      "Robespierre, a Jacobin, led the Committee of Public Safety until he himself was guillotined in July 1794."
  },
  {
    id: "q5",
    prompt: "Which slogan summarized the Revolution's stated ideals?",
    choices: [
      { id: "a", text: "Bread, peace, land" },
      { id: "b", text: "Liberty, equality, fraternity" },
      { id: "c", text: "Faith, family, freedom" },
      { id: "d", text: "Order, hierarchy, tradition" }
    ],
    correct: "b",
    rationale:
      "'Liberté, égalité, fraternité' became the slogan; whether the Reign of Terror honored or betrayed it is exactly the kind of question your unit asks you to argue."
  }
];

type Answers = Record<string, string | undefined>;

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ExamSimPage() {
  const [allotted, setAllotted] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [running, setRunning] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Timer effect.
  useEffect(() => {
    if (!running || submitted) return;
    if (secondsLeft <= 0) {
      setSubmitted(true);
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, submitted, secondsLeft]);

  function start(): void {
    setSecondsLeft(allotted * 60);
    setRunning(true);
    setSubmitted(false);
    setAnswers({});
  }

  function reset(): void {
    setSecondsLeft(allotted * 60);
    setRunning(false);
    setSubmitted(false);
    setAnswers({});
  }

  function pickAnswer(qid: string, choice: string): void {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: choice }));
  }

  function submit(): void {
    setSubmitted(true);
    setRunning(false);
    // TODO(real-mode): POST results to /api/student/exam-sim once the
    // server-side question bank exists. The shell here is intentionally
    // client-only for the demo.
  }

  const score = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;
    for (const q of QUESTIONS) {
      if (answers[q.id] === q.correct) correct++;
    }
    return { correct, total: QUESTIONS.length };
  }, [submitted, answers]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Exam simulator</h1>
        <p className="text-ink-soft">
          A short, timed drill on the current unit (French Revolution).
          Pick your time, then go.
        </p>
      </header>

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <label className="label flex items-center gap-2">
          Time
          <select
            className="input max-w-[10rem]"
            value={allotted}
            onChange={(e) => setAllotted(Number(e.target.value))}
            disabled={running}
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={25}>25 minutes</option>
            <option value={45}>45 minutes</option>
          </select>
        </label>
        <div className="ml-auto flex items-center gap-3">
          <div
            className="rounded-md border border-paper-soft px-3 py-2 font-mono text-sm text-ink"
            aria-live="polite"
          >
            {formatTime(secondsLeft)}
          </div>
          {running ? (
            <button type="button" className="btn-outline" onClick={reset}>
              Reset
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={start}>
              {submitted ? "Try again" : "Start"}
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {QUESTIONS.map((q, idx) => {
          const picked = answers[q.id];
          const isRight = submitted && picked === q.correct;
          const isWrong = submitted && picked !== undefined && picked !== q.correct;
          return (
            <div key={q.id} className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Question {idx + 1} of {QUESTIONS.length}
              </div>
              <p className="mt-2 font-medium text-ink">{q.prompt}</p>
              <ul className="mt-3 space-y-2">
                {q.choices.map((c) => {
                  const selected = picked === c.id;
                  const correctChoice = submitted && c.id === q.correct;
                  const wrongPick = submitted && selected && c.id !== q.correct;
                  return (
                    <li key={c.id}>
                      <label
                        className={
                          "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm " +
                          (correctChoice
                            ? "border-signal-ok/60 bg-signal-ok/5"
                            : wrongPick
                              ? "border-signal-alert/60 bg-signal-alert/5"
                              : selected
                                ? "border-brand-400 bg-brand-50/40"
                                : "border-paper-soft hover:bg-paper-soft")
                        }
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={c.id}
                          checked={selected ?? false}
                          onChange={() => pickAnswer(q.id, c.id)}
                          disabled={submitted || (!running && !submitted)}
                          className="mt-1"
                        />
                        <span>{c.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {submitted ? (
                <div
                  className={
                    "mt-3 rounded-md border px-3 py-2 text-sm " +
                    (isRight
                      ? "border-signal-ok/40 bg-signal-ok/5 text-signal-ok"
                      : isWrong
                        ? "border-signal-alert/40 bg-signal-alert/5 text-signal-alert"
                        : "border-paper-soft bg-paper-soft text-ink-soft")
                  }
                >
                  <strong>{isRight ? "Correct." : isWrong ? "Not quite." : "No answer."}</strong>{" "}
                  {q.rationale}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="flex items-center justify-between gap-3">
        {!submitted ? (
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={!running}
          >
            Submit answers
          </button>
        ) : (
          <div className="card flex w-full items-center justify-between gap-4 p-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Result
              </div>
              <p className="mt-1 text-lg text-ink">
                You got <strong>{score?.correct ?? 0}</strong> out of{" "}
                <strong>{score?.total ?? QUESTIONS.length}</strong>.
              </p>
            </div>
            <button type="button" className="btn-outline" onClick={reset}>
              Reset
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
