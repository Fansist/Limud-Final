import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-muted">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
