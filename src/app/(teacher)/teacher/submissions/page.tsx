// Submission queue: every SUBMITTED-but-not-RETURNED submission across
// all of this teacher's units.

import Link from "next/link";
import { Empty } from "@/components/Empty";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  studentName: string;
  unitTitle: string;
  classroomName: string;
  submittedAt: string | null;
};

export default async function TeacherSubmissionsPage() {
  const viewer = await requireRole("TEACHER");

  let rows: Row[] = [];

  if (viewer.kind === "demo") {
    // Demo: empty queue, by design.
    rows = [];
  } else {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: viewer.userId },
      include: { classrooms: { select: { id: true } } }
    });
    if (teacher) {
      const classroomIds = teacher.classrooms.map((c) => c.id);
      const subs = await prisma.submission.findMany({
        where: {
          status: "SUBMITTED",
          unit: { classroomId: { in: classroomIds } }
        },
        include: {
          student: { include: { user: true } },
          unit: { include: { classroom: true } }
        },
        orderBy: { submittedAt: "asc" }
      });
      rows = subs.map((s) => ({
        id: s.id,
        studentName: s.student.user.name ?? s.student.user.email,
        unitTitle: s.unit.title,
        classroomName: s.unit.classroom.name,
        submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null
      }));
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-ink">Submissions</h1>
        <p className="text-ink-soft">
          {rows.length === 0
            ? "Nothing waiting on you."
            : `${rows.length} submission${rows.length === 1 ? "" : "s"} to grade.`}
        </p>
      </header>

      {rows.length === 0 ? (
        <Empty
          title="Inbox zero"
          body="No submissions awaiting your review. Limud will flag the burnout-reducer items the moment work comes in."
          action={{ label: "Back to dashboard", href: "/teacher" }}
        />
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Classroom</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-soft">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {r.studentName}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.unitTitle}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.classroomName}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.submittedAt ? formatDate(r.submittedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/teacher/submissions/${r.id}`}
                        className="btn-outline text-sm"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
