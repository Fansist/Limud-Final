import Link from "next/link";
import { cookies } from "next/headers";
import { LogIn, PlayCircle } from "lucide-react";
import { Brand } from "@/components/Brand";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { DEMO_COOKIE } from "@/lib/demo/mode";
import type { Viewer } from "@/lib/types";

type Props = {
  viewer: Viewer | null;
  // Show role switcher when in demo mode.
  showRoleSwitcher?: boolean;
};

export function TopBar({ viewer, showRoleSwitcher }: Props) {
  const currentDemoCookie = showRoleSwitcher
    ? cookies().get(DEMO_COOKIE)?.value
    : undefined;
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container-page flex items-center justify-between py-3 gap-4">
        <Brand size="sm" />
        <div className="flex items-center gap-3 sm:gap-4">
          {showRoleSwitcher ? (
            <RoleSwitcher current={currentDemoCookie} />
          ) : null}
          {viewer ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-500">
              {viewer.kind === "demo" ? (
                <span className="badge-primary">Demo</span>
              ) : null}
              <span className="font-medium text-gray-700">
                {viewer.name ?? "Member"}
              </span>
            </span>
          ) : (
            <Link
              href="/sign-in"
              className="btn-ghost text-sm"
            >
              <LogIn size={16} strokeWidth={2} aria-hidden /> Sign in
            </Link>
          )}
          <Link href="/demo" className="btn-secondary text-sm">
            <PlayCircle size={16} strokeWidth={2} aria-hidden /> Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
