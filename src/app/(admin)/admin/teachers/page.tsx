// District teachers — load table. Click a row to drill into the (stub)
// teacher detail. Scoped strictly to the admin's district.

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Empty } from "@/components/Empty";
import { loadDistrictRollup } from "../../_rollup";

export default async function AdminTeachersPage() {
  const viewer = await requireRole("DISTRICT_ADMIN");
  const rollup = await loadDistrictRollup(viewer);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {rollup.districtName}
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">Teachers</h1>
        <p className="text-ink-soft">
          {rollup.teacherLoad.length} teacher
          {rollup.teacherLoad.length === 1 ? "" : "s"} in the district. Bold
          rows are above the district mean by student count.
        </p>
      </header>

      {rollup.teacherLoad.length === 0 ? (
        <Empty
          title="No teachers yet"
          body="Once teachers are provisioned in this district they'll show up here with their classroom load."
        />
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Classrooms</th>
                  <th className="px-4 py-2">Students</th>
                  <th className="px-4 py-2">Pending submissions</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-soft">
                {rollup.teacherLoad.map((row) => (
                  <tr
                    key={row.teacherId}
                    className={row.isOverloaded ? "bg-signal-warn/5" : undefined}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.isOverloaded
                            ? "font-semibold text-ink"
                            : "font-medium text-ink"
                        }
                      >
                        {row.name}
                      </span>
                      {row.isOverloaded ? (
                        <span className="badge-warn ml-2">over avg</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {row.activeUnits === 0 ? "—" : row.activeUnits}
                      <span className="ml-1 text-xs text-ink-muted">
                        active units
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{row.studentCount}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {row.pendingSubmissions === 0
                        ? "Inbox zero"
                        : row.pendingSubmissions}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/teachers/${row.teacherId}`}
                        className="btn-ghost text-xs"
                      >
                        Open →
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
