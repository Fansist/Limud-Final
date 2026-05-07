import { CloudOff } from "lucide-react";

// Visible "AI offline" indicator. Per the brief's non-negotiable:
// "AI failures are visible. We never silently fall back to fake content
// and pretend it was real."
// Render this anywhere AI-produced content (or its demo fallback) is
// shown when `offline === true`.

type Props = {
  reason?: string;
  variant?: "inline" | "block";
};

export function AIOfflineBadge({ reason, variant = "inline" }: Props) {
  if (variant === "block") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700"
      >
        <div className="flex items-start gap-3">
          <CloudOff size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">AI offline.</strong>{" "}
            Personalization isn&apos;t available right now, so you&apos;re
            seeing demo content. Limud will not fabricate AI output.
            {reason ? (
              <span className="mt-1 block text-xs opacity-80">
                Detail: {reason}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
  return (
    <span
      role="status"
      title={reason ?? "AI service is unavailable; showing demo content"}
      className="badge-offline"
    >
      <CloudOff size={12} strokeWidth={2.25} aria-hidden /> AI offline
    </span>
  );
}
