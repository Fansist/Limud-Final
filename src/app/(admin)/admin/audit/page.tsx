// THE FERPA + CURRICULUM COMPLIANCE VIEW.
// Top: recent district-actor audit log rows.
// Bottom: side-by-side comparison of a unit's source Material vs. every
// MaterialRender that was generated for a student. This view IS the
// proof that personalization preserves the same objectives.

import { requireRole } from "@/lib/auth";
import { Empty } from "@/components/Empty";
import { AIOfflineBadge } from "@/components/AIOfflineBadge";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/utils";
import { loadAuditView } from "../../_audit-data";
import type { AuditRow } from "../../_audit-data";

function fmtTimestamp(iso: string): string {
  return formatDate(iso, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function payloadPreview(p: Record<string, unknown>): string {
  const entries = Object.entries(p);
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 3)
    .map(([k, v]) => {
      const value =
        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
          ? String(v)
          : JSON.stringify(v);
      const trimmed = value.length > 40 ? `${value.slice(0, 40)}…` : value;
      return `${k}=${trimmed}`;
    })
    .join(" · ");
}

function eventBadge(event: AuditRow["event"]): string {
  switch (event) {
    case "CROSS_ROLE_VIEW":
      return "badge-warn";
    case "SUBMISSION_GRADED":
    case "MATERIAL_REVIEWED":
      return "badge-ok";
    case "EXPORT":
      return "badge-alert";
    default:
      return "badge";
  }
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: { unit?: string };
}) {
  const viewer = await requireRole("DISTRICT_ADMIN");
  const view = await loadAuditView(viewer, { unitId: searchParams.unit });

  // Audit a CROSS_ROLE_VIEW only when the admin actually opened a unit's
  // material — i.e. the side-by-side compliance comparison.
  if (view.bundle && viewer.kind === "user") {
    await audit({
      viewer,
      event: "CROSS_ROLE_VIEW",
      subjectId: view.bundle.unitId,
      payload: { surface: "admin-audit-material-vs-renders" }
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {view.districtName}
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Audit trail — FERPA &amp; curriculum compliance
        </h1>
        <p className="text-ink-soft">
          Every cross-role view, every render, every grade. Below: the
          original Material vs. every personalized render, side by side.
        </p>
      </header>

      <section className="card">
        <div className="border-b border-paper-soft p-4">
          <h2 className="text-lg font-semibold text-ink">Recent audit log</h2>
          <p className="text-sm text-ink-soft">
            Most recent {view.rows.length} events across in-district actors.
          </p>
        </div>
        {view.rows.length === 0 ? (
          <div className="p-6">
            <Empty
              title="No audit events yet"
              body="Once teachers and students start interacting with units, every privileged read shows up here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2">Timestamp</th>
                  <th className="px-4 py-2">Actor</th>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-soft">
                {view.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                      {fmtTimestamp(r.createdAtIso)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{r.actorName}</div>
                      <div className="text-xs text-ink-muted">
                        {r.actorEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={eventBadge(r.event)}>{r.event}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {r.subjectId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {payloadPreview(r.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-soft p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Material vs. Renders
            </h2>
            <p className="text-sm text-ink-soft">
              The source content every teacher uploaded vs. each
              student's personalized render. Same objectives, same
              vocabulary — different presentation.
            </p>
          </div>
          <UnitPicker
            options={view.unitOptions}
            current={view.bundle?.unitId ?? ""}
          />
        </div>

        {!view.bundle ? (
          <div className="p-6">
            <Empty
              title="Pick a unit"
              body="Use the picker to compare the original Material to every render that was produced for a student."
            />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  {view.bundle.classroomName}
                </p>
                <h3 className="text-lg font-semibold text-ink">
                  {view.bundle.unitTitle}
                </h3>
              </div>
              <p className="text-xs text-ink-muted">
                {view.bundle.renders.length} render
                {view.bundle.renders.length === 1 ? "" : "s"} on file ·
                source Lexile{" "}
                {view.bundle.sourceLexile > 0
                  ? view.bundle.sourceLexile
                  : "—"}
              </p>
            </header>

            {view.bundle.objectives.length > 0 ? (
              <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-3 text-xs text-ink">
                <strong className="font-semibold">
                  Learning objectives preserved across every render:
                </strong>
                <ul className="mt-1 list-disc pl-5">
                  {view.bundle.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="card border-t-4 border-t-brand-500 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Original — what every teacher uploaded
                </p>
                <h4 className="mt-1 text-sm font-semibold text-ink">
                  Material.sourceHtml
                </h4>
                <div
                  className="prose-limud mt-3 max-h-[42rem] overflow-y-auto rounded-md border border-paper-soft bg-paper-soft/40 p-3"
                  dangerouslySetInnerHTML={{ __html: view.bundle.sourceHtml }}
                />
              </article>

              <article className="card border-t-4 border-t-accent-warm p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-warm">
                  Renders — what each student saw
                </p>
                <h4 className="mt-1 text-sm font-semibold text-ink">
                  MaterialRender.renderedHtml ({view.bundle.renders.length})
                </h4>
                {view.bundle.renders.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">
                    No renders yet for this unit.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {view.bundle.renders.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-md border border-paper-soft"
                      >
                        <details>
                          <summary className="cursor-pointer list-none px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="font-medium text-ink">
                                {r.studentName}
                              </span>
                              <span className="flex items-center gap-2 text-xs text-ink-muted">
                                <span>
                                  model:{" "}
                                  <code>{r.modelUsed || "—"}</code>
                                </span>
                                <span>· {fmtTimestamp(r.createdAtIso)}</span>
                                {r.isOffline ? <AIOfflineBadge /> : null}
                              </span>
                            </div>
                          </summary>
                          <div
                            className="prose-limud max-h-[34rem] overflow-y-auto border-t border-paper-soft bg-paper-soft/30 p-3"
                            dangerouslySetInnerHTML={{
                              __html: r.renderedHtml
                            }}
                          />
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function UnitPicker({
  options,
  current
}: {
  options: Array<{ id: string; title: string; classroomName: string }>;
  current: string;
}) {
  if (options.length === 0) {
    return (
      <span className="text-xs text-ink-muted">No units in district yet.</span>
    );
  }
  return (
    <form method="get" className="flex items-center gap-2 text-sm">
      <label htmlFor="unit" className="text-ink-muted">
        Compare unit:
      </label>
      <select
        id="unit"
        name="unit"
        defaultValue={current}
        className="input max-w-xs"
      >
        <option value="">— Pick a unit —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title} ({o.classroomName})
          </option>
        ))}
      </select>
      <button type="submit" className="btn-outline text-xs">
        Compare
      </button>
    </form>
  );
}
