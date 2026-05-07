// Student chrome. Top bar + horizontal section nav.
// Force dynamic so the demo cookie reads work on every request.

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/student", label: "Today" },
  { href: "/student/classrooms", label: "Classes" },
  { href: "/student/tutor", label: "Tutor" },
  { href: "/student/heatmap", label: "Heatmap" },
  { href: "/student/exam-sim", label: "Exam Sim" }
];

export default async function StudentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireRole("STUDENT");
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
