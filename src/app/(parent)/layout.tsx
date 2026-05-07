// Parent chrome. Top bar + horizontal section nav.
// Force dynamic so the demo cookie reads work on every request.
//
// NOTE: this layout does NOT call requireRole("PARENT") because the
// /parent/register page is part of this route group but is intentionally
// public (sign-up flow). Each protected page in (parent) calls
// requireRole("PARENT") itself.

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/parent", label: "Children" },
  { href: "/parent/digest", label: "Weekly Digest" },
  { href: "/parent/register", label: "Add Child" }
];

export default async function ParentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  return (
    <div className="min-h-screen bg-paper">
      <TopBar viewer={viewer} showRoleSwitcher={viewer?.kind === "demo"} />
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
