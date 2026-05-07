// Self-ed (homeschool) chrome. Top bar + horizontal section nav. The
// SELF_ED user is a hybrid (parent + teacher) — Today is their
// dashboard, Onboarding spins up a "district of one", New Unit reuses
// the same two-upload spine.

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/self", label: "Today" },
  { href: "/self/onboarding", label: "Onboarding" },
  { href: "/self/units/new", label: "New Unit" }
];

export default async function SelfLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireRole("SELF_ED");
  return (
    <div className="min-h-screen bg-paper">
      <TopBar viewer={viewer} showRoleSwitcher={viewer.kind === "demo"} />
      <div className="border-b border-paper-soft bg-white/40">
        <nav className="container-page flex flex-wrap gap-1 py-2 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 font-medium text-ink hover:bg-paper-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="container-page space-y-6 py-6">{children}</main>
    </div>
  );
}
