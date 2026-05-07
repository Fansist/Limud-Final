// District admin chrome. Top bar + left nav. Force dynamic so the demo
// cookie reads work on every request.

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireRole("DISTRICT_ADMIN");
  return (
    <div className="min-h-screen bg-paper">
      <TopBar viewer={viewer} showRoleSwitcher={viewer.kind === "demo"} />
      <div className="container-page grid gap-6 py-6 md:grid-cols-[14rem_1fr]">
        <aside className="card h-fit p-3 md:sticky md:top-6">
          <nav className="flex flex-col gap-1 text-sm">
            <Link
              href="/admin"
              className="rounded-md px-3 py-2 font-medium text-ink hover:bg-paper-soft"
            >
              Overview
            </Link>
            <Link
              href="/admin/teachers"
              className="rounded-md px-3 py-2 font-medium text-ink hover:bg-paper-soft"
            >
              Teachers
            </Link>
            <Link
              href="/admin/audit"
              className="rounded-md px-3 py-2 font-medium text-ink hover:bg-paper-soft"
            >
              Audit Trail
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
