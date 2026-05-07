import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  ClipboardList,
  Heart,
  Building2,
  Home,
  MessageCircle,
  CloudOff
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Brand } from "@/components/Brand";
import { getViewer } from "@/lib/auth";

export default async function DemoLandingPage() {
  const viewer = await getViewer();
  return (
    <main className="min-h-screen bg-gray-50">
      <TopBar viewer={viewer} showRoleSwitcher />
      <section className="mesh-gradient">
        <div className="container-page py-12 md:py-16 animate-fade-in">
          <div className="max-w-3xl">
            <Brand size="lg" withTagline />
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Welcome to the Limud demo
            </h1>
            <p className="mt-3 text-gray-600 text-base leading-relaxed">
              Use the role switcher above to step into any seat. Same dataset
              everywhere — pick a perspective and walk through it. AI is stubbed
              in this demo: every personalized surface shows the
              <span className="badge-offline mx-1.5 align-middle">
                <CloudOff size={12} strokeWidth={2.25} aria-hidden /> AI offline
              </span>
              indicator and serves pre-baked content for Maya, Diego, and Priya.
              No keys. No DB. No setup.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ROUTE_CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="card lift group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${c.swatch}`}
                aria-hidden
              >
                {c.icon}
              </span>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary-600">
                {c.tag}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {c.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 group-hover:gap-2 transition-all">
                Open <ArrowRight size={14} strokeWidth={2} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-sm text-gray-500">
          To exit demo mode and sign in,{" "}
          <Link href="/sign-in" className="text-primary-600 hover:text-primary-700 font-medium">
            go to sign-in
          </Link>
          .
        </div>
      </section>
    </main>
  );
}

const ROUTE_CARDS: Array<{
  href: string;
  title: string;
  body: string;
  tag: string;
  icon: React.ReactNode;
  swatch: string;
}> = [
  {
    href: "/student",
    title: "Student",
    body:
      "Maya's classroom view, with the personalized French Revolution material side-by-side with the uniform assignment.",
    tag: "Student",
    icon: <Backpack size={22} strokeWidth={2} />,
    swatch: "bg-primary-50 text-primary-700"
  },
  {
    href: "/teacher",
    title: "Teacher",
    body:
      "Ms. Alvarez's burnout-reducer dashboard. Two-upload unit flow. Per-student preview before publish.",
    tag: "Teacher",
    icon: <ClipboardList size={22} strokeWidth={2} />,
    swatch: "bg-accent-50 text-accent-700"
  },
  {
    href: "/parent",
    title: "Parent",
    body:
      "Mr. Chen's view of Maya's progress, plus the same personalized material she's reading at home.",
    tag: "Parent",
    icon: <Heart size={22} strokeWidth={2} />,
    swatch: "bg-success-50 text-success-700"
  },
  {
    href: "/admin",
    title: "District Admin",
    body:
      "Dr. Patel's rollups, equity views, and the full FERPA audit trail showing source vs. personalized renders.",
    tag: "District",
    icon: <Building2 size={22} strokeWidth={2} />,
    swatch: "bg-warning-50 text-warning-700"
  },
  {
    href: "/self",
    title: "Self-Education",
    body:
      "Homeschool 'district of one' — parent acts as teacher and uploads the same two-upload contract.",
    tag: "Homeschool",
    icon: <Home size={22} strokeWidth={2} />,
    swatch: "bg-violet-50 text-violet-700"
  },
  {
    href: "/student/tutor",
    title: "AI Tutor",
    body:
      "Socratic by default; switch to Direct mode on demand. Always shows AI offline when the model is down.",
    tag: "Tutor",
    icon: <MessageCircle size={22} strokeWidth={2} />,
    swatch: "bg-primary-50 text-primary-700"
  }
];
