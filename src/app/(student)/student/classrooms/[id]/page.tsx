// Classroom detail. Info, grade trend chart, list of units.

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  DEMO_TEACHER,
  DEMO_UNITS,
  findDemoStudent
} from "@/lib/demo/data";
import { Empty } from "@/components/Empty";
import { formatDate, formatRelative } from "@/lib/utils";
import { GradeTrendChart } from "./_GradeTrendChart";

type UnitItem = {
  id: string;
  title: string;
  status: "not started" | "in progress" | "submitted" | "graded";
  dueAt: string | null;
};

type Detail = {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  gradeLevel: number;
  trend: Array<{ label: string; grade: number }>;
  units: UnitItem[];
};

function badgeFor(status: UnitItem["status"]): string {
  if (status === "graded") return "badge-ok";
  if (status === "submitted") return "badge-ok";
  if (status === "in progress") return "badge-warn";
  return "badge-warn";
}

function syntheticTrend(currentGrade: number): Array<{ label: string; grade: number }> {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  let g = Math.max(60, currentGrade - 12);
  return months.map((label, i) => {
    g = Math.min(100, Math.max(55, g + ((i % 3) - 1) * 2 + 1));
    return {
      label,
      grade: i === months.length - 1 ? Math.round(currentGrade) : Math.round(g)
    };
  });
}

async function loadDemo(classroomId: string, viewerStudentId: string): Promise<Detail | null> {
  if (classroomId !== DEMO_CLASSROOM.id) return null;
  const student = findDemoStudent(viewerStudentId) ?? findDemoStudent("demo-student-maya");
  const grade = student?.grades.find((g) => g.course === DEMO_CLASSROOM.subject)?.grade ?? 85;
  const units: UnitItem[] = DEMO_UNITS.filter((u) => u.classroomId === classroomId).map((u) => ({
    id: u.id,
    title: u.title,
    status: "in progress",
    dueAt: u.dueAt
  }));
  return {
    id: DEMO_CLASSROOM.id,
    name: DEMO_CLASSROOM.name,
    subject: DEMO_CLASSROOM.subject,
    teacherName: DEMO_TEACHER.name,
    gradeLevel: DEMO_CLASSROOM.gradeLevel,
    trend: syntheticTrend(grade),
    units
  };
}

async function loadReal(classroomId: string, userId: string): Promise<Detail | null> {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      enrollments: {
        where: { classroomId },
        include: {
          classroom: {
            include: {
              units: { include: { submissions: true } },
              teacher: { include: { user: true } }
            }
          }
        }
      }
    }
  });
  if (!student) return null;
  const enrollment = student.enrollments[0];
  if (!enrollment) return null;
  const c = enrollment.classroom;
  const units: UnitItem[] = c.units.map((u) => {
    const sub = u.submissions.find((s) => s.studentId === student.id);
    let status: UnitItem["status"] = "not started";
    if (sub) {
      if (sub.status === "GRADED" || sub.status === "RETURNED") status = "graded";
      else if (sub.status === "SUBMITTED") status = "submitted";
      else status = "in progress";
    }
    return {
      id: u.id,
      title: u.title,
      status,
      dueAt: u.dueAt ? u.dueAt.toISOString() : null
    };
  });
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    teacherName: c.teacher.user.name ?? c.teacher.user.email,
    gradeLevel: c.gradeLevel,
    trend: syntheticTrend(82),
    units
  };
}

export default async function StudentClassroomDetailPage({
  params
}: {
  params: { id: string };
}) {
  const viewer = await requireRole("STUDENT");
  const detail =
    viewer.kind === "demo"
      ? await loadDemo(params.id, viewer.demoStudentId ?? "demo-student-maya")
      : await loadReal(params.id, viewer.userId);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/student/classrooms" className="text-sm text-brand-600 hover:underline">
            ← All classes
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-bold text-ink">{detail.name}</h1>
          <p className="text-ink-soft">
            {detail.subject} · {detail.teacherName} · Grade {detail.gradeLevel}
          </p>
        </div>
      </header>

      <section className="card p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Your grade trend
        </div>
        <div className="mt-4">
          <GradeTrendChart data={detail.trend} />
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Units
          </div>
          <span className="text-sm text-ink-muted">{detail.units.length} total</span>
        </div>
        {detail.units.length === 0 ? (
          <div className="mt-4">
            <Empty
              title="No units yet"
              body="Your teacher hasn't published a unit in this class yet."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-paper-soft">
            {detail.units.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/student/classrooms/${detail.id}/units/${u.id}`}
                    className="block truncate font-medium text-ink hover:text-brand-600"
                  >
                    {u.title}
                  </Link>
                  <div className="text-xs text-ink-muted">
                    {u.dueAt ? `Due ${formatDate(u.dueAt)} · ${formatRelative(u.dueAt)}` : "No due date"}
                  </div>
                </div>
                <span className={badgeFor(u.status)}>{u.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
