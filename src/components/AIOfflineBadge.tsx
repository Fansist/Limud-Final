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
        className="rounded-lg border border-signal-offline/40 bg-signal-offline/10 px-4 py-3 text-sm text-signal-offline"
      >
        <strong className="font-semibold">AI offline.</strong>{" "}
        Personalization isn't available right now, so you're seeing demo
        content. Limud will not fabricate AI output.
        {reason ? (
          <span className="mt-1 block text-xs opacity-80">Detail: {reason}</span>
        ) : null}
      </div>
    );
  }
  return (
    <span
      role="status"
      title={reason ?? "AI service is unavailable; showing demo content"}
      className="badge-offline"
    >
      <span aria-hidden>●</span> AI offline
    </span>
  );
}
