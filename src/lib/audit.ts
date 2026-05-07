// Audit log helper. Used by every cross-role view, every personalization
// render, every grade write. Required by the brief's FERPA + curriculum
// compliance posture.

import type { AuditEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/types";

export async function audit(args: {
  viewer: Viewer;
  event: AuditEvent;
  payload?: Record<string, unknown>;
  subjectId?: string;
}): Promise<void> {
  // In demo mode the actor is not a real user; skip persistence so we
  // don't create rows for synthetic activity.
  if (args.viewer.kind === "demo") return;
  await prisma.auditLog.create({
    data: {
      actorUserId: args.viewer.userId,
      event: args.event,
      payload: JSON.stringify(args.payload ?? {}),
      subjectId: args.subjectId
    }
  });
}
