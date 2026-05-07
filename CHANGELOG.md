# Changelog

All notable changes to Limud are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
follows semantic versioning.

## [0.1.0] — 2026-05-07

Initial multi-agent build: foundation + four role surfaces + review +
verification. Phase 0 laid the schema, auth, AI wrapper, and demo
dataset; Phase 1 shipped the four role surfaces in parallel; Phase 2
addressed the review punch list (4 HIGH + 5 MEDIUM).

### Added

- **Two-upload model** as the data spine: `Unit → Assignment (uniform)
  + Material (source) → MaterialRender (per-student personalized cache)`.
  Enforced in the Prisma schema, in the route layout, and in the API.
- **Six roles** with strict isolation: `STUDENT`, `TEACHER`, `PARENT`,
  `DISTRICT_ADMIN`, `SELF_ED`, `DEMO`. One route group per role under
  `src/app/(student|teacher|parent|admin|self)/` and one API namespace
  per role under `src/app/api/<role>/`.
- **Master demo account** mirroring the brief: Ms. Alvarez's Period 3
  World History class working the French Revolution unit, with
  pre-baked personalized renders for Maya (visual / comic), Diego
  (auditory / rap), and Priya (kinesthetic / kitchen recipe). Lives
  in-memory in `src/lib/demo/data.ts`.
- **Demo mode middleware**: `?demo=true` (or `=1` / `=yes`) installs a
  cookie and redirects to a clean URL. Demo viewers never touch the DB
  or call Gemini.
- **Gemini wrapper** (`src/lib/ai/gemini.ts`) with the mandated
  fallback chain: `gemini-2.5-flash → gemini-2.0-flash →
  gemini-1.5-flash → gemini-flash-latest`. Returns `offline: true` on
  empty key or all-models-failed.
- **Personalization service** (`src/lib/ai/personalize.ts`) that reads
  a `Material`, calls Gemini with the student profile, and caches the
  result as a `MaterialRender` row keyed on `(materialId, studentId)`
  and tagged with a `profileHash`.
- **AI tutor** (`src/lib/ai/tutor.ts`) supporting Socratic and Direct
  modes.
- **AI feedback drafter** (`src/lib/ai/feedback.ts`) producing the
  draft a teacher edits before sending.
- **Audit log** (`src/lib/audit.ts`) writing `AuditLog` rows for every
  `MATERIAL_RENDERED`, `MATERIAL_REVIEWED`, `ASSIGNMENT_PUBLISHED`,
  `SUBMISSION_GRADED`, `TUTOR_SESSION_OPENED`, `CROSS_ROLE_VIEW`, and
  `EXPORT` event.
- **Auto-grader on uniform assignments** (`POST
  /api/student/submissions`): when a student submits and the unit's
  Assignment carries an `answerKey` (keyword-list or per-question
  expected-substring shape), Limud computes a `scoreAuto` against the
  same key for every student. The teacher remains the authority — the
  grader UI shows the auto-score as the starting value, which the
  teacher overrides via `scoreFinal`.
- **Auth viewer pattern** (`src/lib/auth.ts`): `getViewer()`,
  `requireViewer()`, `requireRole(...)`, plus typed `AuthError` and
  `authErrorResponse(...)` so every API route can reject in one line.
- **Student surfaces**: dashboard, classroom list & detail, per-unit
  material reader (with AI Offline badge), assignment submission,
  mastery heatmap, AI tutor, exam simulator stub.
- **Teacher surfaces**: dashboard, classroom list & detail with
  enrollment, new-unit two-upload form, unit detail, per-student render
  preview, submission queue, grading view with AI-drafted feedback.
- **Parent surfaces**: dashboard, child detail, child's personalized
  material reader (with cross-role audit entry), weekly digest preview,
  multi-child registration (gated).
- **Admin surfaces**: district rollup dashboard, teacher list and
  drill-in, audit log viewer with `Material.sourceHtml` vs.
  `MaterialRender.renderedHtml` diff.
- **Self-ed surfaces**: onboarding bootstrap that auto-creates a
  `District.isSelfEd = true`, plus the same two-upload Unit form the
  teacher uses, scoped to the district-of-one.
- **Demo walkthrough** at `/demo` with a role switcher and the master
  walkthrough.
- **Sign-in page** + NextAuth credentials provider with bcrypt-hashed
  passwords and JWT sessions.

### Known stubs (deferred to v0.2)

- File upload for assignments uses text-paste; the storage adapter is
  not wired.
- Resend weekly digest sends only when `RESEND_API_KEY` is set;
  otherwise the UI shows "email not configured."
- Exam-sim has hard-coded MCQs; the question bank is not wired.
- Tutor transcripts are not persisted to `TutorSession` in this
  iteration (the table exists; the writer doesn't).
- Parent registration requires `LIMUD_ALLOW_INSECURE_PARENT_LINK` in
  dev until the schema gains `Student.inviteCode`.
- `prisma/seed` for production data is best-effort; the demo dataset
  is the canonical example data.
- Bulk feedback drafting (one-shot draft for every SUBMITTED in a unit)
  isn't a single endpoint yet — teachers draft per submission.
- Teacher per-student knowledge view shows the profile snapshot; the
  deeper "knowledge graph + intervention log" view is stubbed.
- The seed script does not write `KnowledgeNode` / `MasteryRecord`
  rows yet, so a freshly-seeded real DB has empty heatmaps until
  classroom interaction populates them.

### Security

- Role isolation enforced via central `requireRole(...)` plus
  per-resource scoping (parents to linked children only, teachers to
  their own classrooms only, district admins to their own district
  only).
- `callbackUrl` validated to refuse open redirects.
- Audit log records every cross-role view, every render, every grade
  write.
- Demo mode never writes to the DB; in-memory data only, no `userId`,
  no audit entries.
- Credentials hashed with bcrypt; sessions are JWT (no DB lookup on
  every request).
- ESLint config bans `any` and `@ts-ignore` so type erasure cannot
  silently smuggle around a role gate.

### Not yet

- Real student invite codes (the schema needs `Student.inviteCode`
  before parent registration can become safe outside dev).
- File-based assignment uploads (PDFs, images, docx) — text-paste
  only for now.
- Production-grade rate limiting on registration and tutor endpoints.
- Persisted tutor transcripts.
- Real exam-sim question bank.
- Internationalized UI (the platform supports per-student `language`
  on personalization but the chrome is English-only).
