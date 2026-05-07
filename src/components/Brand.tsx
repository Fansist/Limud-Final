import Link from "next/link";
import { GraduationCap } from "lucide-react";

type Props = {
  size?: "sm" | "md" | "lg";
  href?: string;
  withTagline?: boolean;
};

export function Brand({ size = "md", href = "/", withTagline = false }: Props) {
  const wordSize =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const taglineSize = size === "lg" ? "text-sm" : "text-xs";
  const iconSize = size === "lg" ? 28 : size === "sm" ? 18 : 22;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 leading-tight no-underline group"
    >
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #2563eb 0%, #c026d3 100%)"
        }}
        aria-hidden
      >
        <GraduationCap size={iconSize} strokeWidth={2} />
      </span>
      <span className="flex flex-col">
        <span
          className={`font-bold tracking-tight gradient-text ${wordSize}`}
        >
          Limud
        </span>
        {withTagline ? (
          <span className={`text-gray-500 ${taglineSize}`}>
            Every mind learns differently.
          </span>
        ) : null}
      </span>
    </Link>
  );
}
