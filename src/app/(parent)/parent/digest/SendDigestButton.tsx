"use client";

// "Send to my email" button. Posts to /api/parent/digest/[childId] and
// surfaces a polite message regardless of whether RESEND_API_KEY is
// configured. We never lie about the email having been sent.

import { useState } from "react";

type Props = {
  childId: string;
  childName: string;
};

export function SendDigestButton({ childId, childName }: Props): JSX.Element {
  const [pending, setPending] = useState<boolean>(false);
  const [message, setMessage] = useState<{ kind: "ok" | "info" | "error"; text: string } | null>(
    null
  );

  async function onClick(): Promise<void> {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/parent/digest/${childId}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        sent?: boolean;
        reason?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data.error ?? "Could not send the digest."
        });
        return;
      }
      if (data.sent) {
        setMessage({
          kind: "ok",
          text: `Sent ${childName}'s digest to your email.`
        });
      } else {
        setMessage({
          kind: "info",
          text:
            "Email sending isn't configured in this environment. " +
            "When the school enables it, this button will deliver " +
            "the digest above to your inbox."
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary text-sm"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "Sending…" : `Send ${childName}'s digest to my email`}
      </button>
      {message ? (
        <p
          role="status"
          className={
            message.kind === "ok"
              ? "text-sm text-signal-ok"
              : message.kind === "error"
                ? "text-sm text-signal-alert"
                : "text-sm text-ink-soft"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
