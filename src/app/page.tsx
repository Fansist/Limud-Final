import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-paper to-white">
      <header className="container-page flex items-center justify-between py-6">
        <Brand size="md" withTagline />
        <nav className="flex items-center gap-3">
          <Link href="/sign-in" className="btn-ghost text-sm">Sign in</Link>
          <Link href="/demo" className="btn-primary text-sm">See the demo</Link>
        </nav>
      </header>

      <section className="container-page grid gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <p className="badge-ok">For grades 6–12</p>
          <h1 className="font-serif text-5xl font-bold leading-tight tracking-tight text-ink">
            Same assessment for every student.<br />
            <span className="text-brand-600">Personalized teaching</span> for each one.
          </h1>
          <p className="text-lg text-ink-soft">
            Limud is the second teacher in the room — the one who notices
            which student didn't get it, figures out why, and re-teaches
            it the way that specific student needs.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo" className="btn-primary">
              See the demo (no sign-in)
            </Link>
            <Link href="/sign-in" className="btn-outline">
              I have an account
            </Link>
          </div>
          <p className="text-sm text-ink-muted">
            FERPA-compliant. Student data never trains third-party models.
          </p>
        </div>

        <div className="card p-6 md:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            The Two-Upload Model
          </h2>
          <p className="mt-2 text-ink">
            Teachers upload two things per unit. Limud handles the rest.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-paper-soft p-4">
              <div className="text-xs font-semibold uppercase text-brand-600">
                Assignment
              </div>
              <div className="mt-1 font-medium">Identical for everyone.</div>
              <p className="mt-2 text-sm text-ink-muted">
                Same questions, same rubric, same deadline. Fairness in
                evaluation is non-negotiable.
              </p>
            </div>
            <div className="rounded-lg border border-paper-soft p-4">
              <div className="text-xs font-semibold uppercase text-accent-warm">
                Material
              </div>
              <div className="mt-1 font-medium">Different for each kid.</div>
              <p className="mt-2 text-sm text-ink-muted">
                Re-rendered to each student's learning style, interests,
                reading level, and language. Same facts. Same objectives.
                Three different experiences of getting there.
              </p>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-ink-soft">
            <li>• Detect → Personalize → Intervene, on every interaction.</li>
            <li>• AI failures are always visible. No silent fakery.</li>
            <li>• Demo mode works with zero data, zero keys.</li>
          </ul>
        </div>
      </section>

      <footer className="container-page py-10 text-sm text-ink-muted">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-paper-soft pt-6">
          <span>© Limud — every mind learns differently.</span>
          <div className="flex gap-4">
            <Link href="/demo">Demo</Link>
            <a href="https://github.com/Fansist/Limud-Final" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
