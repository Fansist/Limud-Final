"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserCog } from "lucide-react";

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
  const [value, setValue] = useState<string>(
    current ?? "STUDENT:demo-student-maya"
  );
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
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden sm:inline-flex items-center gap-1.5 text-gray-500">
        <UserCog size={16} strokeWidth={2} aria-hidden />
        Demo as
      </span>
      <span className="relative">
        <select
          className="input-field appearance-none pr-9 max-w-xs cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          aria-label="Switch demo role"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </span>
      {pending ? (
        <span className="text-gray-500 text-xs">switching…</span>
      ) : null}
    </label>
  );
}
