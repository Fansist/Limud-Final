// POST /api/self/bootstrap
// Bootstraps a homeschool family in one shot:
//   - User { role: SELF_ED } (the parent-as-teacher)
//   - District { isSelfEd: true } (the "district of one")
//   - Teacher row inside that district for the parent
//   - Classroom inside that district
//   - For each child: User { role: STUDENT } + Student row + Enrollment
// Demo mode short-circuits with { ok: true, demo: true } and never
// touches the database.

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEMO_COOKIE } from "@/lib/demo/mode";
import { getViewer } from "@/lib/auth";

const ChildSchema = z.object({
  name: z.string().min(1).max(120),
  gradeLevel: z.number().int().min(0).max(12)
});

const BodySchema = z.object({
  parent: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(200),
    password: z.string().min(8).max(200)
  }),
  classroomName: z
    .string()
    .min(1)
    .max(160)
    .default(`Home — ${new Date().getFullYear()}`),
  children: z.array(ChildSchema).min(1).max(20)
});

function inDemoMode(): boolean {
  return Boolean(cookies().get(DEMO_COOKIE)?.value);
}

function deriveStudentEmail(parentEmail: string, name: string): string {
  // Synthetic per-kid email so the unique-email constraint holds even
  // when the parent doesn't have separate inboxes for each child. The
  // parent stays the source of truth.
  const handle = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "child";
  const [user, domain] = parentEmail.split("@");
  if (!user || !domain) return `${handle}@home.invalid`;
  return `${user}+${handle}@${domain}`;
}

function defaultLearningStyles(): string {
  // We don't yet know a child's modality on day one. Default to a blend
  // of visual + reading_writing — the most common combination in K-12
  // — and let the parent refine on the student profile page later.
  return "visual,reading_writing";
}

export async function POST(req: Request): Promise<Response> {
  // Demo mode: never persist. The brief explicitly says short-circuit.
  if (inDemoMode()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  // Bootstrapping a new homeschool family is a sign-up flow — only
  // valid for visitors who don't already have an account. A signed-in
  // STUDENT/TEACHER/PARENT/ADMIN must not be able to spawn a
  // SELF_ED district under arbitrary emails.
  const viewer = await getViewer();
  if (viewer && viewer.kind === "user") {
    return NextResponse.json(
      { error: "Sign out first to start a new homeschool family." },
      { status: 403 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const parentEmail = body.parent.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: parentEmail }
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hash(body.parent.password, 10);
  // Pre-hash student placeholder password so the type checker stays
  // happy and so a kid account can later be enabled with a real
  // password reset.
  const studentPlaceholderHash = await hash(
    `placeholder:${parentEmail}:${Date.now()}`,
    10
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const district = await tx.district.create({
        data: {
          name: `${body.parent.name}'s homeschool`,
          isSelfEd: true
        }
      });

      const parentUser = await tx.user.create({
        data: {
          email: parentEmail,
          name: body.parent.name,
          role: "SELF_ED",
          passwordHash,
          teacher: {
            create: { districtId: district.id }
          }
        },
        include: { teacher: true }
      });
      if (!parentUser.teacher) {
        throw new Error("Teacher row not created");
      }

      const classroom = await tx.classroom.create({
        data: {
          districtId: district.id,
          teacherId: parentUser.teacher.id,
          name: body.classroomName,
          subject: "Homeschool",
          gradeLevel: Math.round(
            body.children.reduce((a, c) => a + c.gradeLevel, 0) /
              body.children.length
          )
        }
      });

      const childIds: string[] = [];
      for (const child of body.children) {
        const studentEmail = deriveStudentEmail(parentEmail, child.name);
        const childUser = await tx.user.create({
          data: {
            email: studentEmail,
            name: child.name,
            role: "STUDENT",
            passwordHash: studentPlaceholderHash,
            student: {
              create: {
                districtId: district.id,
                gradeLevel: child.gradeLevel,
                learningStyles: defaultLearningStyles()
              }
            }
          },
          include: { student: true }
        });
        if (!childUser.student) {
          throw new Error("Student row not created");
        }
        await tx.enrollment.create({
          data: {
            classroomId: classroom.id,
            studentId: childUser.student.id
          }
        });
        childIds.push(childUser.student.id);
      }

      return {
        districtId: district.id,
        classroomId: classroom.id,
        parentUserId: parentUser.id,
        childStudentIds: childIds
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bootstrap failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
