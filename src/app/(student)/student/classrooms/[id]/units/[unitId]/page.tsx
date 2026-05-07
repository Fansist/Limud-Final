// THE SPINE VIEWER. Two columns side-by-side at md+:
//   Left  — Assignment.bodyHtml (uniform for everyone) + response form
//   Right — Personalized MaterialRender (made for this student)
// AI-offline badge above the right column when offline === true.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  findDemoStudent,
  findDemoUnit
} from "@/lib/demo/data";
import { personalizeMaterial, profileHash } from "@/lib/ai/personalize";
import { audit } from "@/lib/audit";
import { AIOfflineBadge } from "@/components/AIOfflineBadge";
import type {
  PersonalizedRender,
  StudentProfile
} from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/utils";
import { SubmissionForm } from "./_SubmissionForm";

type Loaded = {
  classroomId: string;
  unitId: string;
  title: string;
  dueAt: string | null;
  studentName: string;
  assignmentHtml: string;
  render: PersonalizedRender;
  draftBody: string;
};

function parseLearningStyles(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
function parseInterests(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function loadDemo(
  classroomId: string,
  unitId: string,
  viewerStudentId: string
): Promise<Loaded | null> {
  if (classroomId !== DEMO_CLASSROOM.id) return null;
  const unit = findDemoUnit(unitId);
  if (!unit) return null;
  const student = findDemoStudent(viewerStudentId) ?? findDemoStudent("demo-student-maya");
  if (!student) return null;
  const profile: StudentProfile = {
    studentId: student.studentId,
    name: student.name,
    gradeLevel: student.gradeLevel,
    lexile: student.lexile,
    language: student.language,
    learningStyles: student.learningStyles,
    interests: student.interests
  };
  const render = await personalizeMaterial({
    sourceHtml: unit.material.sourceHtml,
    objectives: unit.material.objectives,
    profile,
    demoMaterialKey: unit.material.demoKey
  });
  return {
    classroomId,
    unitId,
    title: unit.title,
    dueAt: unit.dueAt,
    studentName: student.name,
    assignmentHtml: unit.assignment.bodyHtml,
    render,
    draftBody: ""
  };
}

async function loadReal(
  classroomId: string,
  unitId: string,
  userId: string,
  viewerName: string | null
): Promise<Loaded | null> {
  const student = await prisma.student.findUnique({
    where: { userId }
  });
  if (!student) return null;
  // Confirm enrollment in this classroom.
  const enrollment = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId, studentId: student.id } }
  });
  if (!enrollment) return null;
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { assignment: true, material: true }
  });
  if (!unit || unit.classroomId !== classroomId) return null;
  if (!unit.assignment || !unit.material) return null;
  const profile: StudentProfile = {
    studentId: student.id,
    name: viewerName ?? "Student",
    gradeLevel: student.gradeLevel,
    lexile: student.lexile,
    language: student.language,
    learningStyles: parseLearningStyles(student.learningStyles),
    interests: parseInterests(student.interests)
  };
  const expectHash = profileHash(profile);
  let cached = await prisma.materialRender.findUnique({
    where: {
      materialId_studentId: { materialId: unit.material.id, studentId: student.id }
    }
  });
  // Invalidate cache if the profile changed or the material was republished.
  if (
    cached &&
    (cached.profileHash !== expectHash ||
      unit.material.updatedAt.getTime() > cached.createdAt.getTime())
  ) {
    await prisma.materialRender.delete({ where: { id: cached.id } });
    cached = null;
  }
  let objectives: string[] = [];
  try {
    const parsed = JSON.parse(unit.material.objectives) as unknown;
    if (Array.isArray(parsed)) {
      objectives = parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    objectives = [];
  }
  let render: PersonalizedRender;
  if (cached) {
    render = {
      html: cached.renderedHtml,
      modelUsed: cached.modelUsed,
      offline: cached.isOffline
    };
  } else {
    render = await personalizeMaterial({
      sourceHtml: unit.material.sourceHtml,
      objectives,
      profile
    });
    await prisma.materialRender.create({
      data: {
        materialId: unit.material.id,
        studentId: student.id,
        renderedHtml: render.html,
        profileHash: expectHash,
        modelUsed: render.modelUsed,
        isOffline: render.offline
      }
    });
  }
  // Pull existing draft, if any.
  const sub = await prisma.submission.findUnique({
    where: { unitId_studentId: { unitId: unit.id, studentId: student.id } }
  });
  return {
    classroomId,
    unitId,
    title: unit.title,
    dueAt: unit.dueAt ? unit.dueAt.toISOString() : null,
    studentName: profile.name,
    assignmentHtml: unit.assignment.bodyHtml,
    render,
    draftBody: sub?.bodyText ?? ""
  };
}

export default async function StudentUnitPage({
  params
}: {
  params: { id: string; unitId: string };
}) {
  const viewer = await requireRole("STUDENT");
  const data: Loaded | null =
    viewer.kind === "demo"
      ? await loadDemo(
          params.id,
          params.unitId,
          viewer.demoStudentId ?? "demo-student-maya"
        )
      : await loadReal(params.id, params.unitId, viewer.userId, viewer.name);
  if (!data) notFound();

  // Audit MATERIAL_RENDERED on real-mode views (a no-op in demo).
  if (viewer.kind === "user") {
    await audit({
      viewer,
      event: "MATERIAL_RENDERED",
      subjectId: data.unitId,
      payload: { offline: data.render.offline, modelUsed: data.render.modelUsed }
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={`/student/classrooms/${data.classroomId}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← Back to class
        </Link>
        <h1 className="font-serif text-3xl font-bold text-ink">{data.title}</h1>
        <p className="text-sm text-ink-muted">
          {data.dueAt ? `Due ${formatDate(data.dueAt)} · ${formatRelative(data.dueAt)}` : "No due date"}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT — Assignment (uniform) */}
        <section className="card flex flex-col p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Your assignment (same for everyone)
          </div>
          <div
            className="prose-limud mt-3"
            dangerouslySetInnerHTML={{ __html: data.assignmentHtml }}
          />
          <div className="mt-auto">
            <SubmissionForm unitId={data.unitId} initialDraft={data.draftBody} />
          </div>
        </section>

        {/* RIGHT — Material (made for you) */}
        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-warm">
              Made for you, {data.studentName}
            </div>
            {data.render.offline ? <AIOfflineBadge /> : null}
          </div>
          {data.render.offline ? (
            <div className="mt-3">
              <AIOfflineBadge variant="block" />
            </div>
          ) : null}
          <div
            className="prose-limud mt-4"
            dangerouslySetInnerHTML={{ __html: data.render.html }}
          />
        </section>
      </div>

      <section className="card flex flex-col items-start gap-3 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Stuck on this unit?
          </div>
          <p className="mt-1 text-ink">
            The Limud tutor will help you think it through — without giving
            you the answer outright.
          </p>
        </div>
        <Link
          href={`/student/tutor?unitId=${encodeURIComponent(data.unitId)}`}
          className="btn-outline"
        >
          Open AI tutor about this unit
        </Link>
      </section>
    </div>
  );
}
