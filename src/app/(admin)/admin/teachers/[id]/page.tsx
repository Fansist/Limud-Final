// Teacher detail (stub). The full surface lives in another coder's
// scope; this page exists so the teacher table never 404s and admins
// see basic context. Strictly scoped to the admin's district.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import {
  DEMO_CLASSROOM,
  DEMO_STUDENTS,
  DEMO_TEACHER
} from "@/lib/demo/data";

type TeacherDetail = {
  teacherId: string;
  name: string;
  email: string;
  classrooms: Array<{ id: string; name: string; studentCount: number }>;
};

export default async function AdminTeacherDetailPage({
  params
}: {
  params: { id: string };
}) {
  const viewer = await requireRole("DISTRICT_ADMIN");

  let detail: TeacherDetail | null = null;

  if (viewer.kind === "demo") {
    if (params.id !== DEMO_TEACHER.id) notFound();
    detail = {
      teacherId: DEMO_TEACHER.id,
      name: DEMO_TEACHER.name,
      email: "alvarez@demo.limud.test",
      classrooms: [
        {
          id: DEMO_CLASSROOM.id,
          name: DEMO_CLASSROOM.name,
          studentCount: DEMO_STUDENTS.length
        }
      ]
    };
  } else {
    const admin = await prisma.districtAdmin.findUnique({
      where: { userId: viewer.userId }
    });
    if (!admin) notFound();
    const t = await prisma.teacher.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        classrooms: {
          include: { _count: { select: { enrollments: true } } }
        }
      }
    });
    // Strict isolation: never read teachers in another district.
    if (!t || t.districtId !== admin.districtId) notFound();
    detail = {
      teacherId: t.id,
      name: t.user.name ?? t.user.email,
      email: t.user.email,
      classrooms: t.classrooms.map((c) => ({
        id: c.id,
        name: c.name,
        studentCount: c._count.enrollments
      }))
    };
    await audit({
      viewer,
      event: "CROSS_ROLE_VIEW",
      subjectId: t.id,
      payload: { surface: "admin-teacher-detail" }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Teacher detail
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink">
            {detail.name}
          </h1>
          <p className="text-ink-soft">{detail.email}</p>
        </div>
        <Link href="/admin/teachers" className="btn-ghost text-sm">
          ← All teachers
        </Link>
      </header>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Classrooms</h2>
        {detail.classrooms.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No classrooms assigned yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-paper-soft">
            {detail.classrooms.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-ink-soft">
                  {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">
          Teacher detail (stub)
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          A deeper teacher view — load history, intervention queue, and
          per-classroom mastery — is on the roadmap. Use the audit trail
          for now to inspect teaching activity.
        </p>
        <Link href="/admin/audit" className="btn-outline mt-4 inline-flex">
          Open audit trail →
        </Link>
      </section>
    </div>
  );
}
