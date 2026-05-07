import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, DEMO_QUERY } from "@/lib/demo/mode";

// 1) If ?demo=true (or ?demo=1) is on the URL, set the demo cookie and
//    redirect to the same path without the query so we don't keep
//    setting it on every navigation.
// 2) Demo mode never relaxes role isolation in non-demo paths — that's
//    enforced server-side by requireRole(). Middleware only handles
//    the cookie installation and the landing redirect.

export function middleware(req: NextRequest): NextResponse {
  const url = req.nextUrl;
  const demoQuery = url.searchParams.get(DEMO_QUERY);
  if (demoQuery === "true" || demoQuery === "1" || demoQuery === "yes") {
    const next = req.nextUrl.clone();
    next.searchParams.delete(DEMO_QUERY);
    const res = NextResponse.redirect(next);
    // Default to STUDENT:Maya unless an existing demo cookie says otherwise.
    const existing = req.cookies.get(DEMO_COOKIE)?.value;
    res.cookies.set(DEMO_COOKIE, existing || "STUDENT:demo-student-maya", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8
    });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/auth|api/demo|favicon.ico).*)"]
};
