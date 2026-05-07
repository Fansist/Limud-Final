# Limud

> **Every Mind Learns Differently.**

Limud is an adaptive learning platform for U.S. K-12 classrooms (primary
focus: grades 6-12). A teacher publishes one Unit. Limud takes the
teaching content the teacher uploaded and re-renders it for each student
using their learning style, interests, reading level, and language —
while the assignment everyone is graded against stays exactly the same.

**More time, less stress for everyone.**

---

## The Two-Upload Model (the spine)

Every Unit in Limud has exactly two uploads from the teacher: an
**Assignment** that is identical for every student in the class, and a
**Material** that the AI personalizes per student. The two are kept
strictly separate in the schema and in the code, because that separation
is what makes the product fair.

```
                    Teacher uploads (per Unit)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ASSIGNMENT (uniform)         MATERIAL (source)
      same for every student       AI personalizes per student
              │                               │
              │                               ▼
              │                MaterialRender × N students
              │                (cached, profile-hashed)
              ▼                               ▼
        Same grade bar           Three different experiences
        for everyone             of getting there
```

The brief's master example, also the seeded demo: a Period 3 World
History class working on the **French Revolution (1789-1799)**.

- **Maya** (visual learner, loves Marvel comics) opens the unit and gets
  a six-panel comic-book treatment — splash page on the Three Estates,
  hard cut to red for the Reign of Terror, Robespierre's silhouette
  under the blade in the final panel.
- **Diego** (auditory learner, loves hip-hop) opens the same unit and
  gets a four-verse rap — same dates, same vocabulary (Tennis Court
  Oath, Sans-culottes, Jacobins, Guillotine), built to be read aloud.
- **Priya** (kinesthetic learner, loves baking) opens the same unit and
  gets a five-step recipe metaphor — mise en place for the Old Regime,
  reduce-the-sauce-too-far for the Terror, plate it at Thermidor.

All three see the same Assignment with the same rubric and the same due
date. **Same Assignment. Same objectives. Three different paths in.**

---

## Quickstart

```bash
git clone <repo>
cd limud-final
npm install
cp .env.example .env
# Fill in DATABASE_URL + NEXTAUTH_SECRET in .env (GEMINI_API_KEY optional)
npx prisma db push
npm run dev
# Open http://localhost:3000
```

No keys to start? Open `http://localhost:3000/?demo=true` — the demo
runs end-to-end with zero DB and zero AI.

---

## Demo mode

Demo mode is a first-class feature, not an afterthought. The brief's
non-negotiable is that Limud must always be showable, even with no
database and no AI key.

- Append `?demo=true` (or `?demo=1`) to any URL. The middleware in
  `src/middleware.ts` installs a `limud_demo` cookie and redirects to
  the same path without the query.
- The cookie value is `ROLE` or `ROLE:studentId` — pick a role from the
  switcher on `/demo` to walk the same dataset as STUDENT, TEACHER,
  PARENT, DISTRICT_ADMIN, or SELF_ED.
- The master account is the Period 3 World History classroom from the
  brief: Ms. Alvarez teaching Maya, Diego, and Priya through the
  French Revolution unit.
- Demo viewers never write to the database and never call Gemini. The
  in-memory dataset in `src/lib/demo/data.ts` is the ground truth.
- Because no real AI runs in demo mode, every surface that displays a
  personalized render also displays the **AI Offline** badge. That is
  intentional — the brief forbids silently substituting fake content.

---

## Roles at a glance

There are six roles. Each one has its own route group, its own API
namespace, and its own contract for what it may read and write. Read
[ROLES-GUIDE.md](./ROLES-GUIDE.md) before doing real work — the role
boundaries are load-bearing.

| Role             | Home page  | What they do                                                                                       | Key files                                            |
|------------------|------------|----------------------------------------------------------------------------------------------------|------------------------------------------------------|
| `STUDENT`        | `/student` | Read their personalized material, submit assignments, run tutor sessions, take exam-sim drills.    | `src/app/(student)/`, `src/app/api/student/`         |
| `TEACHER`        | `/teacher` | Build classrooms, publish two-upload Units, preview per-student renders, grade with AI-drafted feedback. | `src/app/(teacher)/`, `src/app/api/teacher/`         |
| `PARENT`         | `/parent`  | Link to their child(ren), read the same render the child reads, see grade trends and weekly digest. | `src/app/(parent)/`, `src/app/api/parent/`           |
| `DISTRICT_ADMIN` | `/admin`   | Roll up classrooms in their district, audit `Material.sourceHtml` vs. `MaterialRender.renderedHtml`. | `src/app/(admin)/`, `src/app/api/admin/`             |
| `SELF_ED`        | `/self`    | Homeschool. Acts as both teacher and parent inside their own auto-created "district of one".       | `src/app/(self)/`, `src/app/api/self/`               |
| `DEMO`           | `/demo`    | Showcase walkthrough across all five real roles, against the in-memory dataset.                    | `src/app/demo/`, `src/lib/demo/`                     |

---

## Architecture

- **Framework**: Next.js 14 (App Router), TypeScript in strict mode.
- **Route groups per role**: `src/app/(student|teacher|parent|admin|self)/`
  keep each role surface in disjoint directories so coders working on
  different roles never collide.
- **Shared library**: `src/lib/{auth,prisma,ai,demo,audit,utils,types}/`.
  Anything role-specific stays under the role's own folder.
- **Persistence**: Prisma 5.22 + PostgreSQL. The schema models identity,
  district / classroom / enrollment, **Unit → Assignment + Material →
  MaterialRender**, knowledge graph + mastery, tutor sessions, and the
  audit log. See `prisma/schema.prisma`.
- **Auth**: NextAuth (JWT strategy) with credentials provider. The
  `getViewer()` / `requireViewer()` / `requireRole()` helpers in
  `src/lib/auth.ts` are the one-and-only entry to authenticated work.
- **AI**: Google Gemini via `@google/genai`. The wrapper in
  `src/lib/ai/gemini.ts` walks a fallback chain of
  `gemini-2.5-flash → gemini-2.0-flash → gemini-1.5-flash →
  gemini-flash-latest`. An empty `GEMINI_API_KEY` or all four models
  failing returns `offline: true` and the UI renders the AI Offline
  badge. **There is no silent fallback to fake content.**
- **Personalization cache**: `MaterialRender` rows are keyed on
  `(materialId, studentId)` and tagged with a `profileHash` so they
  invalidate when the student's profile changes or when the teacher
  republishes the source `Material`.
- **Demo mode**: a cookie + `src/lib/demo/data.ts`. Never hits the DB.
- **Audit log**: every cross-role view, every render, every grade write
  records an `AuditLog` row through `src/lib/audit.ts`.

---

## Feature matrix

A snapshot of what shipped in v0.1, with stubs called out. Where a row
says *stubbed*, the surface ships and is wired end-to-end but defers a
production-grade dependency.

| Surface                                              | Role               | Status     | Notes                                                                              |
|------------------------------------------------------|--------------------|------------|------------------------------------------------------------------------------------|
| Classroom list & dashboard                           | STUDENT            | shipped    | `/student`, `/student/classrooms`                                                  |
| Per-unit personalized material view                  | STUDENT            | shipped    | Reads `MaterialRender`, falls back to demo render in demo mode                     |
| Assignment submission (draft + submit)               | STUDENT            | shipped    | Plain-text body                                                                    |
| Mastery heatmap                                      | STUDENT            | shipped    | `/student/heatmap` over `MasteryRecord`                                            |
| AI tutor (Socratic / Direct)                         | STUDENT            | shipped    | Tutor transcripts not yet persisted to `TutorSession` (see Known Stubs)            |
| Exam simulator                                       | STUDENT            | v0.1 stub  | Hard-coded MCQs; question bank not wired                                           |
| Classroom & enrollment management                    | TEACHER            | shipped    | `/teacher/classrooms`                                                              |
| New Unit (two-upload)                                | TEACHER            | shipped    | `/teacher/units/new` — text-paste for both Assignment body and Material source     |
| Per-student render preview                           | TEACHER            | shipped    | `/teacher/units/[id]/preview/[studentId]` — logs `CROSS_ROLE_VIEW`                 |
| Submission grading + AI feedback draft               | TEACHER            | shipped    | Auto-grade vs. rubric, teacher overrides, edits AI draft before sending            |
| Linked-children dashboard                            | PARENT             | shipped    | `/parent/children/[id]`                                                            |
| Read child's personalized render                     | PARENT             | shipped    | Same render the child sees; logs `CROSS_ROLE_VIEW`                                 |
| Multi-child registration                             | PARENT             | gated stub | `/parent/register` requires `LIMUD_ALLOW_INSECURE_PARENT_LINK` until invite codes  |
| Weekly digest email                                  | PARENT             | v0.1 stub  | Sends only when `RESEND_API_KEY` is set; otherwise UI shows "email not configured" |
| District rollup                                      | DISTRICT_ADMIN     | shipped    | `/admin` with subject / mastery / engagement aggregates                            |
| Teacher list + drill-in                              | DISTRICT_ADMIN     | shipped    | `/admin/teachers`, `/admin/teachers/[id]`                                          |
| Audit log viewer                                     | DISTRICT_ADMIN     | shipped    | `/admin/audit` — source vs. render diff, scoped to district                        |
| Onboarding (district-of-one bootstrap)               | SELF_ED            | shipped    | `/self/onboarding` auto-creates `District.isSelfEd = true`                         |
| Self-published Unit                                  | SELF_ED            | shipped    | `/self/units/new` — same two-upload form as teacher                                |
| Role switcher + master walkthrough                   | DEMO               | shipped    | `/demo`; `?demo=true` from anywhere installs the cookie                            |

---

## Scripts

| Command              | What it does                                                                       |
|----------------------|------------------------------------------------------------------------------------|
| `npm run dev`        | Start Next.js in dev mode on port 3000.                                            |
| `npm run build`      | Production build.                                                                  |
| `npm run start`      | Serve the production build.                                                        |
| `npm run lint`       | Run `next lint` (extends `eslint-config-next`; bans `any` and `@ts-ignore`).       |
| `npm run typecheck`  | `tsc --noEmit` against the strict config.                                          |
| `npm run db:generate`| `prisma generate` — regenerate the typed client after a schema edit.               |
| `npm run db:push`    | `prisma db push` — push schema to the database (we do not use `prisma migrate`).   |
| `npm run db:seed`    | Seed a real Postgres instance with a mirror of the demo dataset.                   |

---

## Non-negotiables

These are the brief's five non-negotiables. They apply to every change.

1. **FERPA-compliant.** Student data never trains third-party models.
2. **Uniform assessment.** Personalization happens on the *teaching*
   side, never on the *grading* side.
3. **The teacher remains the authority.** Limud assists; it does not
   replace.
4. **Demo mode always works**, even with zero data and zero AI keys.
5. **AI failures are visible.** Limud never silently falls back to fake
   content.

---

## Stack

- **Next.js 14.2** (App Router) + **React 18.3**
- **TypeScript 5.6**, strict mode (`noImplicitAny`, `noUncheckedIndexedAccess`)
- **Prisma 5.22** + **PostgreSQL**
- **NextAuth 4.24** with the Prisma adapter (JWT strategy)
- **Google Gemini** via `@google/genai` 1.52
- **Tailwind 3.4** + custom design tokens
- **Recharts 2.13** for mastery / grade trend charts
- **Framer Motion 11** for the demo walkthrough transitions
- **jsPDF 2.5** for the parent / admin export-to-PDF flows
- **Resend 4** for parent weekly digests (optional; degrades gracefully)
- **Zod 3.23** for request validation
- **bcryptjs 2.4** for credential hashing

---

## Contributing

Read [ROLES-GUIDE.md](./ROLES-GUIDE.md) before opening a PR. The role
boundaries are the FERPA story, the trust model, and the way the
product feels different from a single-track LMS — they are not a
matter of taste.

The codebase is **TypeScript strict**: no `any`, no `@ts-ignore`. ESLint
enforces both. We use `prisma db push` (never `prisma migrate`). Every
surface that shows AI output must propagate the `offline` flag and
render `<AIOfflineBadge />` when it is true.

If you find yourself wanting to add a `personalizedAssignment` field, a
per-student rubric, or a "merged content" table — stop. The two-upload
spine is the product. Don't collapse it.

---

## License

All rights reserved. © Limud, 2026.
