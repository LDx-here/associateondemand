import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/", "/login", "/api/health"];

export function middleware(req: NextRequest) {
  if (process.env.AOD_AUTH_ENABLED !== "true") {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname;
  if (PUBLIC.some((p) => path === p || path.startsWith("/_next"))) {
    return NextResponse.next();
  }

  const session = req.cookies.get("aod_session")?.value;
  if (!session && !path.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
