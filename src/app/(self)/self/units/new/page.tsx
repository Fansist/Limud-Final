// Self-ed "New unit" page. The two-upload form, posting to
// /api/self/units. The classroom is implicit — the SELF_ED user owns
// exactly one classroom inside their district of one.

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { NewSelfUnitForm } from "./NewSelfUnitForm";

const SAMPLE_RUBRIC = JSON.stringify(
  {
    criteria: [
      {
        name: "Conceptual accuracy",
        weight: 50,
        description: "Key ideas, terms, and relationships are stated correctly."
      },
      {
        name: "Use of vocabulary",
        weight: 25,
        description:
          "Each required term used correctly in context, not just defined in isolation."
      },
      {
        name: "Argument quality",
        weight: 15,
        description:
          "Position is stated, supported by evidence, considers a counter-point."
      },
      {
        name: "Mechanics",
        weight: 10,
        description:
          "Complete sentences, correct capitalization, paragraph breaks where appropriate."
      }
    ]
  },
  null,
  2
);

const SAMPLE_OBJECTIVES = [
  "Identify the key actors and concepts of the unit.",
  "Explain at least three causes that led to the central idea.",
  "Define and use the unit's vocabulary in context.",
  "Evaluate one consequence using evidence from the unit."
].join("\n");

function defaultDueLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(23, 59, 0, 0);
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default async function SelfNewUnitPage() {
  const viewer = await requireRole("SELF_ED");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            New unit · your district of one
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Upload one Assignment + one Material
          </h1>
          <p className="text-ink-soft">
            Two uploads. Limud handles the personalization for every kid.
          </p>
        </div>
        <Link href="/self" className="btn-ghost text-sm">
          ← Back to dashboard
        </Link>
      </header>

      <NewSelfUnitForm
        isDemo={viewer.kind === "demo"}
        defaultRubricJson={SAMPLE_RUBRIC}
        defaultObjectives={SAMPLE_OBJECTIVES}
        defaultDueAt={defaultDueLocal()}
      />
    </div>
  );
}
