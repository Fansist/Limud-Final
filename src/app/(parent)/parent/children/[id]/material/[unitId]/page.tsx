// "Read what they're reading" — parent reads the SAME personalized
// material their linked child is reading. Server component so we call
// personalizeMaterial() once on the server and never expose the raw
// source to the parent's browser before personalization.
//
// Hard rules:
//  - Validate parent-child link; else 403.
//  - Validate the unit is in one of the child's classrooms; else 403.
//  - Render <AIOfflineBadge variant="block" /> when offline.
//  - Audit CROSS_ROLE_VIEW on every load.
//  - The Assignment HTML is also shown so the parent sees the uniform
//    measure the child will be graded on.

import Link from "next/link";
import { notFound } from "next/navigation";
import { AIOfflineBadge } from "@/components/AIOfflineBadge";
import { AuthError, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { personalizeMaterial, profileHash } from "@/lib/ai/personalize";
import { prisma } from "@/lib/prisma";
import {
  DEMO_PARENT,
  findDemoStudent,
  findDemoUnit
} from "@/lib/demo/data";
import type { StudentProfile } from "@/lib/types";

type PageProps = { params: { id: string; unitId: string } };

function csvList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function parseObjectives(raw: string): string[] {
  // Material.objectives is stored as a JSON string of an array of
  // strings. Be defensive: tolerate plain newline-separated text.
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* fallthrough */
  }
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default async function ParentMaterialPage({
  params
}: PageProps): Promise<JSX.Element> {
  const viewer = await requireRole("PARENT");
  const childId = params.id;
  const unitId = params.unitId;

  let childName = "your child";
  let assignmentHtml = "";
  let renderedHtml = "";
  let offline = false;
  let unitTitle = "Unit";

  if (viewer.kind === "demo") {
    if (!DEMO_PARENT.childIds.includes(childId)) {
      throw new AuthError(403, "Not your child");
    }
    const child = findDemoStudent(childId);
    const unit = findDemoUnit(unitId);
    if (!child || !unit) notFound();
    // Demo: every classroom has every demo unit. Still verify membership
    // by classroom id when the demo grows.
    childName = child.name;
    unitTitle = unit.title;
    assignmentHtml = unit.assignment.bodyHtml;
    const profile: StudentProfile = {
      studentId: child.studentId,
      name: child.name,
      gradeLevel: child.gradeLevel,
      lexile: child.lexile,
      language: child.language,
      learningStyles: child.learningStyles,
      interests: child.interests
    };
    const result = await personalizeMaterial({
      sourceHtml: unit.material.sourceHtml,
      objectives: unit.material.objectives,
      profile,
      demoMaterialKey: unit.material.demoKey
    });
    renderedHtml = result.html;
    offline = result.offline;
  } else {
    const parent = await prisma.parent.findUnique({
      where: { userId: viewer.userId },
      include: { children: true }
    });
    const link = parent?.children.find((c) => c.studentId === childId);
    if (!parent || !link) {
      throw new AuthError(403, "Not your child");
    }
    const child = await prisma.student.findUnique({
      where: { id: childId },
      include: { user: true, enrollments: true }
    });
    if (!child) notFound();
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { assignment: true, material: true, classroom: true }
    });
    if (!unit) notFound();
    // The unit must belong to one of the child's classrooms.
    const enrolled = child.enrollments.some(
      (e) => e.classroomId === unit.classroomId
    );
    if (!enrolled) {
      throw new AuthError(403, "Unit is not in any of your child's classrooms");
    }
    if (!unit.material || !unit.assignment) notFound();
    childName = child.user.name ?? child.user.email;
    unitTitle = unit.title;
    assignmentHtml = unit.assignment.bodyHtml;
    const profile: StudentProfile = {
      studentId: child.id,
      name: childName,
      gradeLevel: child.gradeLevel,
      lexile: child.lexile,
      language: child.language,
      learningStyles: csvList(child.learningStyles),
      interests: csvList(child.interests)
    };
    // Use the same MaterialRender row the child sees so the parent
    // reads the EXACT version their kid is reading. Without this we'd
    // call personalize a second time and (with stochastic models) show
    // the parent a different render.
    const hash = profileHash(profile);
    const cached = await prisma.materialRender.findUnique({
      where: {
        materialId_studentId: {
          materialId: unit.material.id,
          studentId: child.id
        }
      }
    });
    const cacheValid =
      cached &&
      cached.profileHash === hash &&
      cached.createdAt >= unit.material.updatedAt;
    if (cacheValid) {
      renderedHtml = cached.renderedHtml;
      offline = cached.isOffline;
    } else {
      const result = await personalizeMaterial({
        sourceHtml: unit.material.sourceHtml,
        objectives: parseObjectives(unit.material.objectives),
        profile
      });
      renderedHtml = result.html;
      offline = result.offline;
      await prisma.materialRender.upsert({
        where: {
          materialId_studentId: {
            materialId: unit.material.id,
            studentId: child.id
          }
        },
        create: {
          materialId: unit.material.id,
          studentId: child.id,
          renderedHtml: result.html,
          profileHash: hash,
          modelUsed: result.modelUsed,
          isOffline: result.offline
        },
        update: {
          renderedHtml: result.html,
          profileHash: hash,
          modelUsed: result.modelUsed,
          isOffline: result.offline
        }
      });
    }
  }

  // Audit cross-role read regardless of demo (no-ops in demo mode).
  await audit({
    viewer,
    event: "CROSS_ROLE_VIEW",
    subjectId: childId,
    payload: {
      route: `/parent/children/${childId}/material/${unitId}`,
      unitId
    }
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/parent/children/${childId}`}
          className="text-sm text-ink-muted underline-offset-2 hover:underline"
        >
          ← Back to {childName}
        </Link>
        <h1 className="font-serif text-3xl font-bold text-ink">{unitTitle}</h1>
      </header>

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
        <p>
          You&apos;re reading the version of this unit personalized for{" "}
          <strong>{childName}</strong>. The assignment they&apos;ll be graded
          on is identical for everyone.
        </p>
      </div>

      {offline ? <AIOfflineBadge variant="block" /> : null}

      <article
        className="prose-limud card p-6"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      <details className="card p-5">
        <summary className="cursor-pointer text-base font-semibold text-ink">
          View the assignment ({childName} will be graded on this exact
          version, same as every classmate)
        </summary>
        <div
          className="prose-limud mt-4"
          dangerouslySetInnerHTML={{ __html: assignmentHtml }}
        />
      </details>
    </div>
  );
}
