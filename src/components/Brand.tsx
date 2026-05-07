import Link from "next/link";

type Props = {
  size?: "sm" | "md" | "lg";
  href?: string;
  withTagline?: boolean;
};

export function Brand({ size = "md", href = "/", withTagline = false }: Props) {
  const wordSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const taglineSize = size === "lg" ? "text-sm" : "text-xs";
  return (
    <Link href={href} className="inline-flex flex-col leading-tight no-underline">
      <span className={`font-serif font-bold tracking-tight text-ink ${wordSize}`}>
        Limud<span className="text-brand-600">.</span>
      </span>
      {withTagline ? (
        <span className={`text-ink-muted ${taglineSize}`}>
          Every mind learns differently.
        </span>
      ) : null}
    </Link>
  );
}
