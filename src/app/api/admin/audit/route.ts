// GET /api/admin/audit?unitId=...&limit=50
// Returns audit log rows scoped to district actors and, when unitId is
// provided, the unit's source Material plus every MaterialRender on
// file. This is the JSON twin of the audit page.

import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadAuditView } from "@/app/(admin)/_audit-data";

export async function GET(req: Request): Promise<Response> {
  try {
    const viewer = await requireRole("DISTRICT_ADMIN");
    const url = new URL(req.url);
    const unitId = url.searchParams.get("unitId") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const view = await loadAuditView(viewer, {
      unitId,
      limit: Number.isFinite(limit) ? (limit as number) : undefined
    });
    if (view.bundle && viewer.kind === "user") {
      await audit({
        viewer,
        event: "CROSS_ROLE_VIEW",
        subjectId: view.bundle.unitId,
        payload: { surface: "api-admin-audit" }
      });
    }
    return NextResponse.json(view);
  } catch (err) {
    return authErrorResponse(err);
  }
}
