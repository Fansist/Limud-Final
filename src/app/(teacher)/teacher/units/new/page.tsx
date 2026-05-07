// "New unit" page — the two-upload form. The classroom comes from the
// ?classroom= query param. In demo mode the form posts to nowhere and
// shows a banner.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_CLASSROOM } from "@/lib/demo/data";
import { NewUnitForm } from "./NewUnitForm";

const SAMPLE_RUBRIC = JSON.stringify(
  {
    criteria: [
      {
        name: "Historical accuracy",
        weight: 40,
        description: "Dates, names, and sequences match the unit. No invented facts."
      },
      {
        name: "Use of vocabulary",
        weight: 25,
        description:
          "Each required term used correctly in context, not just defined in isolation."
      },
      {
        name: "Argument quality",
        weight: 25,
        description:
          "Position is stated, supported by at least two specific events, considers a counter-point."
      },
      {
        name: "Mechanics",
        weight: 10,
        description:
          "Complete sentences, proper proper-noun capitalization, paragraph breaks where appropriate."
      }
    ]
  },
  null,
  2
);

const SAMPLE_OBJECTIVES = [
  "Identify the key actors and dates of the unit.",
  "Explain at least three causes that led to the central event.",
  "Define and use the unit's vocabulary in context.",
  "Evaluate one consequence using evidence from the unit."
].join("\n");

function defaultDueLocal(): string {
  // 14 days out, in YYYY-MM-DDTHH:mm format expected by datetime-local.
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(23, 59, 0, 0);
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default async function NewUnitPage({
  searchParams
}: {
  searchParams: { classroom?: string };
}) {
  const viewer = await requireRole("TEACHER");
  const classroomId = searchParams.classroom;
  if (!classroomId) {
    redirect("/teacher/classrooms");
  }

  let classroomName = "";
  if (viewer.kind === "demo") {
    if (classroomId !== DEMO_CLASSROOM.id) notFound();
    classroomName = DEMO_CLASSROOM.name;
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) notFound();
    const c = await prisma.classroom.findUnique({
      where: { id: classroomId }
    });
    if (!c || c.teacherId !== teacher.id) notFound();
    classroomName = c.name;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            New unit · {classroomName}
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Upload one Assignment + one Material
          </h1>
          <p className="text-ink-soft">
            Two uploads. Limud handles the personalization for every student.
          </p>
        </div>
        <Link
          href={`/teacher/classrooms/${classroomId}`}
          className="btn-ghost text-sm"
        >
          ← Back to classroom
        </Link>
      </header>

      <NewUnitForm
        classroomId={classroomId}
        isDemo={viewer.kind === "demo"}
        defaultRubricJson={SAMPLE_RUBRIC}
        defaultObjectives={SAMPLE_OBJECTIVES}
        defaultDueAt={defaultDueLocal()}
      />
    </div>
  );
}
