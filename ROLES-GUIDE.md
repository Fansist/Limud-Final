# ROLES-GUIDE.md

Read this before doing real work in Limud. Role boundaries are
load-bearing: they're the FERPA story, the trust model, and the way
the product actually feels different from a single-track LMS.

There are **six** role values:

| Role             | Who it is                                         | Default home |
|------------------|---------------------------------------------------|--------------|
| `STUDENT`        | A K-12 student.                                   | `/student`   |
| `TEACHER`        | A classroom teacher.                              | `/teacher`   |
| `PARENT`         | A parent/guardian linked to one or more students. | `/parent`    |
| `DISTRICT_ADMIN` | A district-level administrator.                   | `/admin`     |
| `SELF_ED`        | Self-education / homeschool parent-as-teacher.    | `/self`      |
| `DEMO`           | The master demo walkthrough account.              | `/demo`      |

`SELF_ED` is the only "hybrid" role — they upload the two-upload unit
themselves (acting as teacher) and view their kid's progress (acting
as parent). Every `SELF_ED` is auto-assigned a "district of one"
(`District.isSelfEd = true`) so the same engine works.

## The non-negotiables (every role)

1. **Two-upload spine.** A `Unit` has exactly one `Assignment`
   (uniform across the class) and exactly one `Material` (source
   content the AI personalizes per student). Never let "Material"
   fields creep into the `Assignment` model and never let
   `Assignment` content get personalized.
2. **Uniform assessment.** Personalization happens on the *teaching*
   side. Grading uses the same `Assignment.bodyHtml` and the same
   `Assignment.rubricJson` for every student. No per-student rubric
   weights. No per-student question rewording. Ever.
3. **AI failures are visible.** Every surface that displays AI output
   (or its demo fallback) MUST render `<AIOfflineBadge />` when
   `offline === true` is set on the result. Never silently substitute
   demo content without the indicator.
4. **Demo mode always works.** Every student-facing surface must work
   when `viewer.kind === "demo"` with zero database calls and zero
   AI calls. The in-memory dataset in `src/lib/demo/data.ts` is the
   ground truth for demo mode.
5. **Role isolation.** Never read a student's data as a different
   student. Never read other teachers' classrooms unless you are an
   admin in the same district. Never read a child's data as a
   parent who isn't linked to that child.
6. **Audit log on cross-role views.** Whenever a teacher reviews a
   student's personalized material, a parent reads their child's
   personalized material, or an admin opens any student's record,
   call `audit({ viewer, event, subjectId, payload })` from
   `src/lib/audit.ts`.

## Per-role allowed reads

### `STUDENT` can read
- Their own `User`, `Student`, profile fields.
- Their own `Enrollment` rows and the `Classroom` records linked to
  them.
- The `Unit`s of those classrooms.
- The `Assignment` of those units (the uniform side).
- Their own `MaterialRender` for the units (NEVER the raw
  `Material.sourceHtml` directly — students see only their
  personalized render).
- Their own `Submission` and `MasteryRecord` rows.
- Their own `TutorSession` rows.

### `STUDENT` can write
- Their own `Submission` (draft + submit).
- Their own `TutorSession` messages.
- Their own profile fields (interests, optionally learning style —
  not lexile — that is set by the system or the teacher).

### `TEACHER` can read
- Their own `User` and `Teacher`.
- Their `Classroom`s and the `Enrollment`s within.
- All `Student`s enrolled in their classrooms — including profile,
  `MaterialRender`, `Submission`, `MasteryRecord`. **Not** students
  in other teachers' classrooms.
- All `Unit`s in their classrooms with both `Assignment` and
  `Material` (the source).
- The audit log for events they were the actor on.

### `TEACHER` can write
- Their own `Classroom`s, `Unit`s, `Assignment`s, `Material`s.
- `Submission.scoreFinal` and `Submission.feedbackFinal` for
  submissions in their units.
- The preview-render they generated for any of their students (cached
  in `MaterialRender`).

### `PARENT` can read
- Their own `User` and `Parent`.
- Each linked `Student` (via `ParentChild`) — profile, classrooms,
  `MaterialRender`, `Submission` (graded only — no drafts), grades,
  flags.
- The same personalized `MaterialRender` their child is reading
  (so they can help with homework). This MUST log a
  `CROSS_ROLE_VIEW` audit entry.

### `PARENT` can write
- Their own profile.
- New `ParentChild` link **only** through the multi-child registration
  flow (which requires the child's invite code; never silently link).

### `DISTRICT_ADMIN` can read
- Everything in their `District`. Nothing in other districts.
- Audit logs scoped to their district.
- The full audit trail showing original `Material.sourceHtml` vs.
  `MaterialRender.renderedHtml` for any unit. This is the FERPA +
  curriculum compliance view.

### `DISTRICT_ADMIN` can write
- District-level configuration only. Never grade overrides, never
  feedback edits — those belong to the teacher.

### `SELF_ED` can read & write
- Their own auto-created `District` (`isSelfEd = true`) and the
  `Classroom`/`Unit`/`Assignment`/`Material` records inside.
- Their linked `Student`s' progress.
- Acts as both teacher and parent for their own kids — but their
  reach stops at the boundary of their own district.

### `DEMO`
- Read-only against the in-memory demo dataset only. Demo viewers
  have no real `userId`, no DB writes, no audit log entries.

## The viewer pattern

All server code uses `getViewer()` / `requireViewer()` /
`requireRole(...)` from `src/lib/auth.ts`:

```ts
import { requireRole, AuthError, authErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const viewer = await requireRole("TEACHER", "DISTRICT_ADMIN");
    // ...
  } catch (err) {
    return authErrorResponse(err);
  }
}
```

Demo viewers come back with `viewer.kind === "demo"` and the chosen
`role`. Branch on `viewer.kind` to either query Prisma (real users)
or call the demo helpers in `src/lib/demo/data.ts` (demo users):

```ts
if (viewer.kind === "demo") {
  // Use DEMO_CLASSROOM, DEMO_STUDENTS, DEMO_UNITS, etc.
} else {
  // Use prisma.classroom.findMany({ where: { teacherId: ... } })
}
```

## The personalization contract

Producers (teachers, self-ed) write `Material.sourceHtml` and
`Material.objectives`. Consumers (students, parents) read
`MaterialRender.renderedHtml` after calling
`personalizeMaterial(...)` from `src/lib/ai/personalize.ts`.

`personalizeMaterial(...)` always returns
`{ html, modelUsed, offline }`. If `offline === true`, the caller
MUST render `<AIOfflineBadge />` near the personalized content. If
the demo `material.demoKey` matches and the student is one of
Maya/Diego/Priya, the call short-circuits to a pre-baked render and
sets `offline: true` (because no real AI ran).

`MaterialRender` is cached. Invalidate by deleting the row when:
- The student's profile fields change (`profileHash` mismatch).
- The teacher republishes the `Material` (`Material.updatedAt`
  newer than `MaterialRender.createdAt`).

## What you may NOT do

- No `any`. No `@ts-ignore`. The ESLint config enforces both.
- No `prisma migrate`. Use `prisma db push` only.
- No silent AI fallback. Always set + propagate the `offline` flag.
- No collapsing the two-upload model. Don't add a `personalizedAssignment`
  field. Don't add a per-student rubric. Don't add a "merged content"
  table.
- No reading student data as a different role unless the role rules
  above explicitly allow it. When in doubt, write a role gate.
- No `prisma.$queryRaw` for student-facing data. Use the typed client
  so the compiler enforces the schema.

## File layout (per role)

Each role surface lives in its own route group and its own API
namespace. Coders working on different roles work in disjoint
directories so they never collide:

```
src/app/(student)/...        src/app/api/student/...
src/app/(teacher)/...        src/app/api/teacher/...
src/app/(parent)/...         src/app/api/parent/...
src/app/(admin)/...          src/app/api/admin/...
src/app/(self)/...           src/app/api/self/...
```

Shared chrome lives in `src/components/`. Shared logic lives in
`src/lib/`. If you find yourself wanting to add code to either of
those from inside a role surface, stop and put the role-specific
component under your own folder instead.
