// Classrooms list. Each card links to /teacher/classrooms/[id].

import Link from "next/link";
import { Empty } from "@/components/Empty";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_CLASSROOM, DEMO_STUDENTS } from "@/lib/demo/data";

type ClassroomCardData = {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  studentCount: number;
};

export default async function TeacherClassroomsPage() {
  const viewer = await requireRole("TEACHER");

  const classrooms: ClassroomCardData[] = [];
  if (viewer.kind === "demo") {
    classrooms.push({
      id: DEMO_CLASSROOM.id,
      name: DEMO_CLASSROOM.name,
      subject: DEMO_CLASSROOM.subject,
      gradeLevel: DEMO_CLASSROOM.gradeLevel,
      studentCount: DEMO_STUDENTS.length
    });
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId },
      include: {
        classrooms: {
          include: { _count: { select: { enrollments: true } } }
        }
      }
    });
    if (teacher) {
      for (const c of teacher.classrooms) {
        classrooms.push({
          id: c.id,
          name: c.name,
          subject: c.subject,
          gradeLevel: c.gradeLevel,
          studentCount: c._count.enrollments
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Classrooms</h1>
          <p className="text-ink-soft">
            Each classroom holds your roster and units.
          </p>
        </div>
      </header>

      {classrooms.length === 0 ? (
        <Empty
          title="No classrooms yet"
          body="Your school admin will provision your classrooms. If you're testing, switch to demo mode."
          action={{ label: "See demo", href: "/demo" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classrooms.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/classrooms/${c.id}`}
              className="card group flex flex-col gap-2 p-5 transition hover:shadow-ring"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                {c.subject} · Grade {c.gradeLevel}
              </div>
              <h2 className="text-lg font-semibold text-ink group-hover:underline">
                {c.name}
              </h2>
              <p className="text-sm text-ink-soft">
                {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
              </p>
              <div className="mt-2 text-sm text-brand-600 group-hover:underline">
                Open classroom →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
