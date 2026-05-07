// District admin overview. The "everything in this district at a
// glance" view: counts, teacher load, equity buckets, recent
// escalations.

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Empty } from "@/components/Empty";
import { loadDistrictRollup } from "../_rollup";
import { EquityChart } from "../_EquityChart";

function severityClass(severity: "info" | "warn" | "alert"): string {
  if (severity === "alert") return "badge-alert";
  if (severity === "warn") return "badge-warn";
  return "badge-ok";
}

export default async function AdminOverviewPage() {
  const viewer = await requireRole("DISTRICT_ADMIN");
  const rollup = await loadDistrictRollup(viewer);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {rollup.districtName}
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          District at a glance
        </h1>
        <p className="text-ink-soft">
          Counts, teacher load, equity, and the kids worth your attention
          today.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Teachers" value={String(rollup.counts.teachers)} />
        <Stat label="Classrooms" value={String(rollup.counts.classrooms)} />
        <Stat label="Students" value={String(rollup.counts.students)} />
        <Stat
          label="Active units"
          value={String(rollup.counts.activeUnits)}
          sub="Published, not archived"
        />
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-soft p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Teacher load</h2>
            <p className="text-sm text-ink-soft">
              Bold rows are teachers above the district mean.
            </p>
          </div>
          <Link href="/admin/teachers" className="btn-ghost text-sm">
            All teachers →
          </Link>
        </div>
        {rollup.teacherLoad.length === 0 ? (
          <div className="p-6">
            <Empty
              title="No teachers in this district yet"
              body="Teachers will appear here once they're provisioned."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Teacher</th>
                  <th className="px-4 py-2">Students</th>
                  <th className="px-4 py-2">Active units</th>
                  <th className="px-4 py-2">Pending submissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-soft">
                {rollup.teacherLoad.map((row) => (
                  <tr
                    key={row.teacherId}
                    className={row.isOverloaded ? "bg-signal-warn/5" : undefined}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/teachers/${row.teacherId}`}
                        className={
                          row.isOverloaded
                            ? "font-semibold text-ink hover:underline"
                            : "font-medium text-brand-700 hover:underline"
                        }
                      >
                        {row.name}
                      </Link>
                      {row.isOverloaded ? (
                        <span className="badge-warn ml-2">over avg</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink">{row.studentCount}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {row.activeUnits}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {row.pendingSubmissions === 0
                        ? "Inbox zero"
                        : row.pendingSubmissions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Equity view</h2>
            <p className="text-sm text-ink-soft">
              Average mastery by primary learning style for each subject.
              A flat profile means personalization is reaching every modality.
            </p>
          </div>
        </header>
        {rollup.equity.length === 0 ? (
          <div className="mt-4">
            <Empty
              title="No mastery signal yet"
              body="Once students submit work, we'll split mastery by learning style here."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {rollup.equity.map((bucket) => (
              <div
                key={bucket.subject}
                className="rounded-lg border border-paper-soft p-4"
              >
                <h3 className="text-sm font-semibold text-ink">
                  {bucket.subject}
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {bucket.byStyle
                    .filter((b) => b.sampleSize > 0)
                    .map(
                      (b) => `${b.style.replace(/_/g, " ")} (${b.sampleSize})`
                    )
                    .join(" · ") || "no samples"}
                </p>
                <div className="mt-3">
                  <EquityChart rows={bucket.byStyle} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="border-b border-paper-soft p-4">
          <h2 className="text-lg font-semibold text-ink">Recent escalations</h2>
          <p className="text-sm text-ink-soft">
            Flag-severity-alert items across the district.
          </p>
        </div>
        {rollup.escalations.length === 0 ? (
          <div className="p-6">
            <Empty
              title="No active escalations"
              body="Limud will surface them here as soon as a student crosses an alert threshold."
            />
          </div>
        ) : (
          <ul className="divide-y divide-paper-soft">
            {rollup.escalations.map((e, i) => (
              <li
                key={`${e.studentId}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className={severityClass(e.severity)}>
                    {e.severity}
                  </span>{" "}
                  <span className="font-medium text-ink">{e.studentName}</span>{" "}
                  <span className="text-ink-muted">· {e.classroom}</span>
                </div>
                <span className="text-ink-soft">{e.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-ink">Compliance</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The audit trail surface shows exactly what every student was
          shown, against the same source material — for FERPA + curriculum
          compliance.
        </p>
        <Link href="/admin/audit" className="btn-outline mt-4 inline-flex">
          Open audit trail →
        </Link>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-muted">{sub}</div> : null}
    </div>
  );
}
