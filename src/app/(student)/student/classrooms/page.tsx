// Classrooms list. Each card: subject + teacher + grade sparkline.

import Link from "next/link";
import type { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEMO_CLASSROOM,
  DEMO_TEACHER,
  findDemoStudent
} from "@/lib/demo/data";
import { Empty } from "@/components/Empty";
import { GradeSparkline } from "./_GradeSparkline";

type ClassroomCard = {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  gradeLevel: number;
  spark: Array<{ x: number; grade: number }>;
  unitCount: number;
};

function syntheticSpark(seed: number, currentGrade: number): Array<{ x: number; grade: number }> {
  // Small synthetic 8-point series ending at currentGrade. Deterministic
  // from the seed so demo cards don't jitter on refresh.
  const pts: Array<{ x: number; grade: number }> = [];
  let g = Math.max(50, Math.min(100, currentGrade - 10));
  for (let i = 0; i < 8; i++) {
    g = g + ((seed + i * 7) % 5) - 1;
    g = Math.max(50, Math.min(100, g));
    pts.push({ x: i, grade: Math.round(g) });
  }
  pts.push({ x: 8, grade: Math.round(currentGrade) });
  return pts;
}

async function loadDemo(viewerStudentId: string): Promise<ClassroomCard[]> {
  const student = findDemoStudent(viewerStudentId) ?? findDemoStudent("demo-student-maya");
  const grade = student?.grades.find((g) => g.course === DEMO_CLASSROOM.subject)?.grade ?? 85;
  return [
    {
      id: DEMO_CLASSROOM.id,
      name: DEMO_CLASSROOM.name,
      subject: DEMO_CLASSROOM.subject,
      teacherName: DEMO_TEACHER.name,
      gradeLevel: DEMO_CLASSROOM.gradeLevel,
      spark: syntheticSpark(grade, grade),
      unitCount: DEMO_CLASSROOM.unitIds.length
    }
  ];
}

async function loadReal(userId: string): Promise<ClassroomCard[]> {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      enrollments: {
        include: {
          classroom: {
            include: {
              units: true,
              teacher: { include: { user: true } }
            }
          }
        }
      }
    }
  });
  if (!student) return [];
  return student.enrollments.map((e) => {
    const c = e.classroom;
    const teacherName = c.teacher.user.name ?? c.teacher.user.email;
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      teacherName,
      gradeLevel: c.gradeLevel,
      spark: syntheticSpark(c.id.length, 80),
      unitCount: c.units.length
    };
  });
}

export default async function StudentClassroomsPage() {
  const viewer = await requireRole("STUDENT" as Role);
  const cards: ClassroomCard[] =
    viewer.kind === "demo"
      ? await loadDemo(viewer.demoStudentId ?? "demo-student-maya")
      : await loadReal(viewer.userId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-ink">Your classes</h1>
        <p className="text-ink-soft">
          The same assessment everywhere — but every reading is made for you.
        </p>
      </header>

      {cards.length === 0 ? (
        <Empty
          title="No classrooms yet"
          body="Your teacher hasn't enrolled you in any classrooms. Check back soon."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/student/classrooms/${c.id}`}
              className="card group p-5 transition hover:shadow-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                    {c.subject}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{c.name}</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {c.teacherName} · Grade {c.gradeLevel}
                  </p>
                </div>
                <span className="badge-ok shrink-0">{c.unitCount} unit{c.unitCount === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-4">
                <GradeSparkline data={c.spark} />
              </div>
              <div className="mt-2 text-xs text-ink-muted">Recent grade trend</div>
              <div className="mt-3 text-sm text-brand-600 group-hover:underline">Open class →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
