// Preview-before-publish: server component that calls personalize and
// renders the result. In demo mode we hit the pre-baked render and the
// offline badge appears. In real mode we persist a MaterialRender row
// and audit MATERIAL_REVIEWED.

import Link from "next/link";
import { notFound } from "next/navigation";
import { AIOfflineBadge } from "@/components/AIOfflineBadge";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import {
  findDemoStudent,
  findDemoUnit
} from "@/lib/demo/data";
import {
  personalizeMaterial,
  profileHash
} from "@/lib/ai/personalize";
import type { StudentProfile } from "@/lib/types";

function parseObjectives(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    /* noop */
  }
  return [];
}

export default async function TeacherUnitPreviewPage({
  params
}: {
  params: { id: string; studentId: string };
}) {
  const viewer = await requireRole("TEACHER");
  const unitId = params.id;
  const studentId = params.studentId;

  let unitTitle = "";
  let classroomId = "";
  let profile: StudentProfile | null = null;
  let sourceHtml = "";
  let objectives: string[] = [];
  let demoMaterialKey: string | undefined;
  let materialId: string | null = null;

  if (viewer.kind === "demo") {
    const u = findDemoUnit(unitId);
    if (!u) notFound();
    const s = findDemoStudent(studentId);
    if (!s) notFound();
    unitTitle = u.title;
    classroomId = u.classroomId;
    sourceHtml = u.material.sourceHtml;
    objectives = u.material.objectives;
    demoMaterialKey = u.material.demoKey;
    profile = {
      studentId: s.studentId,
      name: s.name,
      gradeLevel: s.gradeLevel,
      lexile: s.lexile,
      language: s.language,
      learningStyles: s.learningStyles,
      interests: s.interests
    };
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId }
    });
    if (!teacher) notFound();
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        classroom: true,
        material: true
      }
    });
    if (!unit || unit.classroom.teacherId !== teacher.id) notFound();
    if (!unit.material) notFound();
    // Validate student is enrolled in this teacher's classroom for this unit.
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classroomId: unit.classroomId },
      include: { student: { include: { user: true } } }
    });
    if (!enrollment) notFound();
    unitTitle = unit.title;
    classroomId = unit.classroomId;
    sourceHtml = unit.material.sourceHtml;
    objectives = parseObjectives(unit.material.objectives);
    materialId = unit.material.id;
    const s = enrollment.student;
    profile = {
      studentId: s.id,
      name: s.user.name ?? s.user.email,
      gradeLevel: s.gradeLevel,
      lexile: s.lexile,
      language: s.language,
      learningStyles: s.learningStyles
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      interests: s.interests
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    };
  }

  const result = await personalizeMaterial({
    sourceHtml,
    objectives,
    profile,
    demoMaterialKey
  });

  // Persist + audit only in real mode.
  if (viewer.kind === "user" && materialId) {
    await prisma.materialRender.upsert({
      where: {
        materialId_studentId: {
          materialId,
          studentId
        }
      },
      update: {
        renderedHtml: result.html,
        modelUsed: result.modelUsed,
        isOffline: result.offline,
        profileHash: profileHash(profile)
      },
      create: {
        materialId,
        studentId,
        renderedHtml: result.html,
        modelUsed: result.modelUsed,
        isOffline: result.offline,
        profileHash: profileHash(profile)
      }
    });
    await audit({
      viewer,
      event: "MATERIAL_REVIEWED",
      subjectId: studentId,
      payload: { unitId, materialId }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Preview · {unitTitle}
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            What {profile.name} will see
          </h1>
          <p className="text-ink-soft">
            Same objectives, same vocab, same dates as the source — re-rendered for{" "}
            {profile.name}.
          </p>
        </div>
        <Link
          href={`/teacher/units/${unitId}`}
          className="btn-ghost text-sm"
        >
          ← Back to unit
        </Link>
      </header>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {profile.name}
            </h2>
            <p className="text-sm text-ink-soft capitalize">
              Styles: {profile.learningStyles.join(", ").replace(/_/g, " ") || "—"}
              {" · "}
              Interests: {profile.interests.join(", ") || "—"}
            </p>
          </div>
          <div className="text-xs text-ink-muted">
            {result.offline
              ? "Personalization cached / demo."
              : `Model: ${result.modelUsed || "—"}`}
          </div>
        </div>
        {viewer.kind === "demo" ? (
          <p className="mt-3 text-xs text-ink-muted">
            Demo mode: this preview is pre-baked, so the offline badge below is expected.
            On a real account, Limud calls the model live.
          </p>
        ) : null}
      </section>

      {result.offline ? <AIOfflineBadge variant="block" /> : null}

      <article
        className="prose-limud max-w-none rounded-xl bg-white p-6 shadow-soft"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />

      <div className="flex justify-between">
        <Link
          href={`/teacher/units/${unitId}`}
          className="btn-ghost text-sm"
        >
          ← Back to unit
        </Link>
        <Link
          href={`/teacher/classrooms/${classroomId}`}
          className="btn-outline text-sm"
        >
          Open classroom
        </Link>
      </div>
    </div>
  );
}
