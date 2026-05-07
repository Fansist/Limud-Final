// Sets the demo cookie so the rest of the app sees a demo viewer.
// POST { role: "STUDENT:demo-student-maya" | "TEACHER" | ... }
// DELETE clears the cookie (exits demo mode).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/demo/mode";

const ALLOWED_PREFIXES = [
  "STUDENT",
  "TEACHER",
  "PARENT",
  "DISTRICT_ADMIN",
  "SELF_ED",
  "DEMO"
];

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { role?: string } | null;
  const role = body?.role;
  if (!role || !ALLOWED_PREFIXES.some((p) => role === p || role.startsWith(`${p}:`))) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  cookies().set(DEMO_COOKIE, role, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    // Demo cookie is short-lived. 8 hours is plenty for a walkthrough.
    maxAge: 60 * 60 * 8
  });
  return NextResponse.json({ ok: true, role });
}

export async function DELETE(): Promise<Response> {
  cookies().delete(DEMO_COOKIE);
  return NextResponse.json({ ok: true });
}
