// POST /api/parent/register
// Multi-child sign-up flow. Creates a User+Parent and links each child
// via ParentChild rows.
//
// IMPORTANT: the schema does not yet have a `Student.inviteCode` field
// (see prisma/schema.prisma — the schema is FROZEN for this iteration).
// For v0.1 we treat the inviteCode value as the child's school email
// when it contains an "@", otherwise we attempt a deterministic match
// on `Student.id` (which is what a school admin export currently
// emits). When a real invite-code field is added to Student, swap the
// lookup in `findStudentByInviteCode` below — the rest of this route
// stays the same.

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  parent: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    password: z.string().min(8).max(200)
  }),
  children: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        inviteCode: z.string().min(1).max(120)
      })
    )
    .min(1)
    .max(20)
});

async function findStudentByInviteCode(
  inviteCode: string
): Promise<{ id: string } | null> {
  // STUB: schema lacks a Student.inviteCode column. We accept either
  // the child's email (if it looks like one) or the raw Student id as
  // a temporary stand-in. Replace with:
  //   prisma.student.findUnique({ where: { inviteCode } })
  // once a real `inviteCode` field is added.
  if (inviteCode.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: inviteCode.toLowerCase() },
      include: { student: true }
    });
    return user?.student ? { id: user.student.id } : null;
  }
  const student = await prisma.student.findUnique({
    where: { id: inviteCode },
    select: { id: true }
  });
  return student;
}

export async function POST(req: Request): Promise<Response> {
  const viewer = await getViewer();

  // In demo mode, never touch the DB. Validate the shape so the form
  // still gets useful feedback.
  if (viewer?.kind === "demo") {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = RegisterSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, demo: true });
  }

  const raw = (await req.json().catch(() => null)) as unknown;
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { parent: parentInput, children } = parsed.data;
  const email = parentInput.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  // Resolve each invite code BEFORE creating the user so we can fail
  // fast with a clear error and never half-create a parent record.
  const resolved: Array<{ studentId: string }> = [];
  for (const c of children) {
    const found = await findStudentByInviteCode(c.inviteCode);
    if (!found) {
      return NextResponse.json(
        {
          error: `Invite code for "${c.name}" did not match a registered student. Ask the school for the correct code.`
        },
        { status: 400 }
      );
    }
    resolved.push({ studentId: found.id });
  }

  const passwordHash = await hash(parentInput.password, 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: parentInput.name,
        passwordHash,
        role: "PARENT"
      }
    });
    const parentRow = await tx.parent.create({
      data: { userId: user.id }
    });
    for (const r of resolved) {
      await tx.parentChild.create({
        data: { parentId: parentRow.id, studentId: r.studentId }
      });
    }
    return { userId: user.id, parentId: parentRow.id, linked: resolved.length };
  });

  return NextResponse.json({ ok: true, ...created });
}
