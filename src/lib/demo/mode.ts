// Demo mode plumbing. The master demo account is always available so
// the product is showable with zero data. Activated by:
//   1. ?demo=true on any URL (middleware sets the cookie)
//   2. Direct sign-in to the demo via /demo
// In demo mode auth is bypassed and the in-memory demo dataset is
// served. Demo mode never relaxes role isolation in non-demo paths.

import type { Role } from "@prisma/client";
import type { Viewer } from "@/lib/types";
import { DEMO_ROLES } from "@/lib/demo/data";

export const DEMO_COOKIE = "limud_demo_role";
export const DEMO_QUERY = "demo";

export function isDemoQuery(searchParams: URLSearchParams): boolean {
  const v = searchParams.get(DEMO_QUERY);
  return v === "true" || v === "1" || v === "yes";
}

export function getDemoViewer(roleCookie: string): Viewer | null {
  const parsed = parseDemoCookie(roleCookie);
  if (!parsed) return null;
  const def = DEMO_ROLES[parsed.role];
  if (!def) return null;
  return {
    kind: "demo",
    role: parsed.role,
    name: def.name,
    demoStudentId: parsed.studentId ?? def.defaultStudentId
  };
}

export function makeDemoCookie(role: Role, studentId?: string): string {
  return studentId ? `${role}:${studentId}` : role;
}

function parseDemoCookie(
  raw: string
): { role: Role; studentId?: string } | null {
  const [roleRaw, studentId] = raw.split(":");
  const allowed: Role[] = [
    "STUDENT",
    "TEACHER",
    "PARENT",
    "DISTRICT_ADMIN",
    "SELF_ED",
    "DEMO"
  ];
  if (!allowed.includes(roleRaw as Role)) return null;
  return {
    role: roleRaw as Role,
    studentId: studentId || undefined
  };
}

export function homePathFor(role: Role): string {
  switch (role) {
    case "STUDENT":
      return "/student";
    case "TEACHER":
      return "/teacher";
    case "PARENT":
      return "/parent";
    case "DISTRICT_ADMIN":
      return "/admin";
    case "SELF_ED":
      return "/self";
    case "DEMO":
      return "/demo";
  }
}
