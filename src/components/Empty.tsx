import Link from "next/link";
import { Inbox } from "lucide-react";

type Props = {
  title: string;
  body?: string;
  action?: { label: string; href: string };
};

export function Empty({ title, body, action }: Props) {
  return (
    <div className="empty-state">
      <Inbox size={40} strokeWidth={1.5} aria-hidden />
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? (
        <Link className="btn-secondary mt-5" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
