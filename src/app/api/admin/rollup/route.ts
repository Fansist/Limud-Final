// GET /api/admin/rollup
// Returns the district overview as JSON. Same shape the admin overview
// page renders. District-scoped — never crosses district boundaries.

import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { loadDistrictRollup } from "@/app/(admin)/_rollup";

export async function GET(): Promise<Response> {
  try {
    const viewer = await requireRole("DISTRICT_ADMIN");
    const rollup = await loadDistrictRollup(viewer);
    return NextResponse.json(rollup);
  } catch (err) {
    return authErrorResponse(err);
  }
}
