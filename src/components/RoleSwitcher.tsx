"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ROLES: Array<{ value: string; label: string; href: string }> = [
  { value: "STUDENT:demo-student-maya", label: "Student — Maya (visual)", href: "/student" },
  { value: "STUDENT:demo-student-diego", label: "Student — Diego (auditory)", href: "/student" },
  { value: "STUDENT:demo-student-priya", label: "Student — Priya (kinesthetic)", href: "/student" },
  { value: "TEACHER", label: "Teacher — Ms. Alvarez", href: "/teacher" },
  { value: "PARENT", label: "Parent — Mr. Chen", href: "/parent" },
  { value: "DISTRICT_ADMIN", label: "District Admin — Dr. Patel", href: "/admin" },
  { value: "SELF_ED", label: "Self-education (homeschool)", href: "/self" }
];

export function RoleSwitcher({ current }: { current?: string }) {
  const [value, setValue] = useState<string>(current ?? "STUDENT:demo-student-maya");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: string): void {
    setValue(next);
    const target = ROLES.find((r) => r.value === next);
    startTransition(async () => {
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next })
      });
      router.push(target?.href ?? "/demo");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="role" className="text-ink-muted">Demo as:</label>
      <select
        id="role"
        className="input max-w-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {pending ? <span className="text-ink-muted text-xs">switching…</span> : null}
    </div>
  );
}
