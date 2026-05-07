import Link from "next/link";
import { Brand } from "@/components/Brand";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import type { Viewer } from "@/lib/types";

type Props = {
  viewer: Viewer | null;
  // Show role switcher when in demo mode.
  showRoleSwitcher?: boolean;
};

export function TopBar({ viewer, showRoleSwitcher }: Props) {
  return (
    <header className="border-b border-paper-soft bg-white/70 backdrop-blur">
      <div className="container-page flex items-center justify-between py-3">
        <Brand size="sm" />
        <div className="flex items-center gap-4">
          {showRoleSwitcher ? <RoleSwitcher /> : null}
          {viewer ? (
            <span className="text-sm text-ink-muted">
              {viewer.kind === "demo" ? "Demo mode · " : ""}
              {viewer.name ?? "Member"}
            </span>
          ) : (
            <Link href="/sign-in" className="btn-ghost text-sm">Sign in</Link>
          )}
          <Link href="/demo" className="btn-outline text-sm">Demo</Link>
        </div>
      </div>
    </header>
  );
}
