import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Brand } from "@/components/Brand";
import { getViewer } from "@/lib/auth";

export default async function DemoLandingPage() {
  const viewer = await getViewer();
  return (
    <main className="min-h-screen bg-paper">
      <TopBar viewer={viewer} showRoleSwitcher />
      <section className="container-page py-12">
        <div className="max-w-3xl">
          <Brand size="lg" withTagline />
          <h1 className="mt-6 font-serif text-3xl font-bold text-ink">
            Welcome to the Limud demo
          </h1>
          <p className="mt-3 text-ink-soft">
            Use the role switcher above to step into any seat. Same data
            everywhere — pick a perspective and walk through it. AI is
            stubbed in this demo: every personalized surface shows the
            <span className="badge-offline mx-1">● AI offline</span>
            indicator and serves pre-baked content for Maya, Diego, and
            Priya. No keys, no DB needed.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/student", title: "Student", body: "Maya's classroom view, with the personalized French Revolution material." },
            { href: "/teacher", title: "Teacher", body: "Ms. Alvarez's burnout-reducer dashboard. Two-upload unit flow." },
            { href: "/parent", title: "Parent", body: "Mr. Chen's view of Maya's progress, plus the same personalized material she's reading." },
            { href: "/admin", title: "District Admin", body: "Dr. Patel's rollups, equity views, and the FERPA audit trail." },
            { href: "/self", title: "Self-Education", body: "Homeschool 'district of one' — parent as teacher." },
            { href: "/student/tutor", title: "AI Tutor", body: "Socratic by default; switch to Direct mode on demand." }
          ].map((c) => (
            <Link key={c.href} href={c.href} className="card group p-5 transition hover:shadow-ring">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                {c.title}
              </div>
              <p className="mt-2 text-ink">{c.body}</p>
              <div className="mt-3 text-sm text-brand-600 group-hover:underline">Open →</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-sm text-ink-muted">
          To exit demo mode and sign in,{" "}
          <Link href="/sign-in" className="text-brand-600">go to sign-in</Link>.
        </div>
      </section>
    </main>
  );
}
