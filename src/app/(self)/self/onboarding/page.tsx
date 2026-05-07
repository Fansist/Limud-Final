// Self-ed onboarding wizard. Single page (no multi-step needed for
// v0.1). Form posts to /api/self/bootstrap which creates the
// User/District(isSelfEd)/Teacher/Classroom/Student rows.

import { requireRole } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export default async function SelfOnboardingPage() {
  const viewer = await requireRole("SELF_ED");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Homeschool onboarding
        </p>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Set up your district of one
        </h1>
        <p className="text-ink-soft">
          One short form spins up your account, your homeschool district,
          your classroom, and your kids' learner profiles. The same engine
          that powers full districts powers yours.
        </p>
      </header>

      <OnboardingForm isDemo={viewer.kind === "demo"} />
    </div>
  );
}
