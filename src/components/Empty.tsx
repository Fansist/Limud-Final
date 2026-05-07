import Link from "next/link";

type Props = {
  title: string;
  body?: string;
  action?: { label: string; href: string };
};

export function Empty({ title, body, action }: Props) {
  return (
    <div className="card flex flex-col items-start gap-3 p-8">
      <h3 className="text-lg font-semibold">{title}</h3>
      {body ? <p className="text-ink-soft">{body}</p> : null}
      {action ? (
        <Link className="btn-outline mt-2" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
