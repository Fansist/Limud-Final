// Multi-child registration page. Public — no requireRole gate so a new
// parent can sign up. We still read the viewer (if any) to pre-fill
// fields and to detect demo mode for the form's submit shortcut.

import { Brand } from "@/components/Brand";
import { getViewer } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function ParentRegisterPage(): Promise<JSX.Element> {
  const viewer = await getViewer();
  const isDemo = viewer?.kind === "demo" && viewer.role === "PARENT";
  const defaultName =
    viewer?.kind === "user"
      ? viewer.name ?? ""
      : isDemo
        ? viewer.name ?? ""
        : "";
  const defaultEmail = viewer?.kind === "user" ? viewer.email : "";

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2">
        <Brand size="md" withTagline />
        <h1 className="font-serif text-3xl font-bold text-ink">
          Add your children
        </h1>
        <p className="text-ink-soft">
          Create your parent account and link one or more children in one
          flow. Each link uses an invite code from the school so we never
          silently link the wrong account.
        </p>
      </header>
      <RegisterForm
        demo={Boolean(isDemo)}
        defaultParentName={defaultName}
        defaultParentEmail={defaultEmail}
      />
    </div>
  );
}
