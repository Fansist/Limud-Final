// POST /api/parent/digest/[childId]
// Send the weekly digest for one linked child to the parent's email.
// Validates parent-child link first; 403 if not linked.
// If RESEND_API_KEY is unset, returns { sent: false, reason } so the
// UI can show a polite "email not configured" notice. We never lie
// about the email having been sent.
// Audits an EXPORT event on every successful send.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  AuthError,
  authErrorResponse,
  requireRole
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  DEMO_PARENT,
  DEMO_UNITS,
  findDemoStudent
} from "@/lib/demo/data";

type RouteContext = { params: { childId: string } };

type DigestPayload = {
  parentEmail: string | null;
  childName: string;
  highlights: string[];
};

function buildDemoPayload(
  childId: string,
  parentEmail: string | null
): DigestPayload | null {
  if (!DEMO_PARENT.childIds.includes(childId)) return null;
  const s = findDemoStudent(childId);
  if (!s) return null;
  const highlights: string[] = [];
  const win = s.masteryByTopic.find((m) => m.trend === "up");
  if (win) {
    highlights.push(
      `Improving on "${win.topic}" — now at ${Math.round(win.mastery * 100)}% mastery.`
    );
  }
  const flag = s.flags[0];
  if (flag) highlights.push(flag.text);
  const unit = DEMO_UNITS[0];
  if (unit) {
    highlights.push(
      `Read "${unit.title}" — personalized for ${s.name}'s learning style.`
    );
  }
  return { parentEmail, childName: s.name, highlights };
}

function digestEmailHtml(p: DigestPayload): string {
  const items = p.highlights
    .map((h) => `<li style="margin: 0.5rem 0; line-height: 1.5;">${escape(h)}</li>`)
    .join("");
  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; color: #0E1116; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.5rem; margin: 0 0 1rem;">${escape(p.childName)}'s week at a glance</h1>
  <p style="color: #5B6472;">A short summary from Limud.</p>
  <ul style="padding-left: 1.25rem;">${items}</ul>
  <p style="color: #5B6472; font-size: 0.875rem; margin-top: 2rem;">
    Sign in to Limud for the full picture.
  </p>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const viewer = await requireRole("PARENT");
    const childId = ctx.params.childId;
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM ?? "Limud <digest@limud.app>";

    let payload: DigestPayload | null = null;

    if (viewer.kind === "demo") {
      payload = buildDemoPayload(childId, null);
      if (!payload) throw new AuthError(403, "Not your child");
    } else {
      const parent = await prisma.parent.findUnique({
        where: { userId: viewer.userId },
        include: { children: true, user: true }
      });
      const link = parent?.children.find((c) => c.studentId === childId);
      if (!parent || !link) throw new AuthError(403, "Not your child");
      const child = await prisma.student.findUnique({
        where: { id: childId },
        include: {
          user: true,
          mastery: { include: { node: true } }
        }
      });
      if (!child) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const childName = child.user.name ?? child.user.email;
      const highlights: string[] = [];
      const top = child.mastery.slice().sort((a, b) => b.mastery - a.mastery)[0];
      if (top) {
        highlights.push(
          `Strongest topic: "${top.node.topic}" (${Math.round(top.mastery * 100)}%).`
        );
      }
      const low = child.mastery.slice().sort((a, b) => a.mastery - b.mastery)[0];
      if (low && low.mastery < 0.5) {
        highlights.push(
          `Watch: "${low.node.topic}" at ${Math.round(low.mastery * 100)}% mastery.`
        );
      }
      payload = {
        parentEmail: parent.user.email,
        childName,
        highlights
      };
    }

    if (!apiKey) {
      return NextResponse.json({
        sent: false,
        reason: "Resend not configured"
      });
    }
    if (!payload.parentEmail) {
      // Demo mode produces a payload with no email — we still report the
      // "not configured" path because we have nowhere to send it.
      return NextResponse.json({
        sent: false,
        reason: "No parent email available in this session"
      });
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: payload.parentEmail,
      subject: `${payload.childName}'s weekly Limud digest`,
      html: digestEmailHtml(payload)
    });
    if (error) {
      return NextResponse.json(
        { sent: false, reason: error.message },
        { status: 502 }
      );
    }
    await audit({
      viewer,
      event: "EXPORT",
      subjectId: childId,
      payload: {
        kind: "weekly_digest_email",
        to: payload.parentEmail
      }
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
