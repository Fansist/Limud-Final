import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Eye,
  Headphones,
  ChefHat,
  CloudOff,
  PlayCircle
} from "lucide-react";
import { Brand } from "@/components/Brand";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="mesh-gradient">
        <div className="container-page flex items-center justify-between py-6">
          <Brand size="md" withTagline />
          <nav className="flex items-center gap-2">
            <Link href="/sign-in" className="btn-ghost text-sm">
              Sign in
            </Link>
            <Link href="/demo" className="btn-primary text-sm">
              <PlayCircle size={16} strokeWidth={2} /> See the demo
            </Link>
          </nav>
        </div>

        <div className="container-page grid gap-12 py-16 md:grid-cols-2 md:py-24 md:items-center">
          <div className="space-y-6 animate-fade-in">
            <span className="badge-primary">
              <Sparkles size={12} strokeWidth={2.25} aria-hidden /> For grades 6–12
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Same assessment.
              <br />
              <span className="gradient-text">Personalized teaching.</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl">
              Limud is the second teacher in the room — the one who notices
              which student didn&apos;t get it, figures out why, and re-teaches
              it the way that specific student needs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="btn-primary">
                See the demo (no sign-in) <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <Link href="/sign-in" className="btn-secondary">
                I have an account
              </Link>
            </div>
            <p className="inline-flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheck size={16} strokeWidth={2} aria-hidden />
              FERPA-compliant. Student data never trains third-party models.
            </p>
          </div>

          <div className="card-glass shadow-lg animate-scale-in">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary-700">
              The Two-Upload Model
            </h2>
            <p className="mt-2 text-base font-semibold text-gray-900">
              Teachers upload two things per unit. Limud handles the rest.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                  Assignment
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  Identical for everyone.
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Same questions, same rubric, same deadline. Fairness in
                  evaluation is non-negotiable.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-600">
                  Material
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  Different for each kid.
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Re-rendered to each student&apos;s style, interests, reading
                  level, and language. Same facts. Same objectives.
                </p>
              </div>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <Sparkles size={16} strokeWidth={2} className="text-primary-500 mt-0.5 shrink-0" />
                Detect → Personalize → Intervene, every interaction.
              </li>
              <li className="flex gap-2">
                <CloudOff size={16} strokeWidth={2} className="text-violet-500 mt-0.5 shrink-0" />
                AI failures are always visible. No silent fakery.
              </li>
              <li className="flex gap-2">
                <PlayCircle size={16} strokeWidth={2} className="text-success-500 mt-0.5 shrink-0" />
                Demo mode works with zero data, zero keys.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Three-student proof */}
      <section className="container-page py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="badge-primary">The proof</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            One unit. Three different ways in.
          </h2>
          <p className="mt-3 text-gray-600">
            Maya, Diego, and Priya are reading the same French Revolution unit.
            Same dates. Same vocabulary. Same final assignment. Three radically
            different presentations of the path.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <ProofCard
            icon={<Eye size={22} strokeWidth={2} />}
            color="primary"
            name="Maya"
            tag="Visual learner · loves Marvel comics"
            body="Her version of the unit is a six-panel comic. Bastille storm scene, Tennis Court Oath splash page, Reign of Terror cut to red."
          />
          <ProofCard
            icon={<Headphones size={22} strokeWidth={2} />}
            color="accent"
            name="Diego"
            tag="Auditory learner · loves rap"
            body="His version is a four-verse rap. Read it aloud and the rhythm carries the dates: 1789, 1792, 1793, 1794."
          />
          <ProofCard
            icon={<ChefHat size={22} strokeWidth={2} />}
            color="success"
            name="Priya"
            tag="Kinesthetic · loves cooking"
            body="Her version is a five-step recipe. Mise en place is the Old Regime; reduce-too-far is the Reign of Terror; plate it is Thermidor."
          />
        </div>

        <div className="mt-12 text-center">
          <Link href="/demo" className="btn-primary">
            Walk through it yourself <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="container-page py-8 text-sm text-gray-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>© Limud — every mind learns differently.</span>
            <div className="flex gap-4">
              <Link className="hover:text-gray-700" href="/demo">Demo</Link>
              <Link className="hover:text-gray-700" href="/sign-in">Sign in</Link>
              <a
                className="hover:text-gray-700"
                href="https://github.com/Fansist/Limud-Final"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

type ProofCardProps = {
  icon: React.ReactNode;
  color: "primary" | "accent" | "success";
  name: string;
  tag: string;
  body: string;
};

function ProofCard({ icon, color, name, tag, body }: ProofCardProps) {
  const swatch =
    color === "primary"
      ? "bg-primary-50 text-primary-700"
      : color === "accent"
        ? "bg-accent-50 text-accent-700"
        : "bg-success-50 text-success-700";
  return (
    <article className="card lift">
      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${swatch}`}
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500">{tag}</p>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{body}</p>
    </article>
  );
}
