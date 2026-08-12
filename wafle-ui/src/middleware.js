import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Redirects only. Authorization is enforced independently in each API route.
export async function middleware(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Reachable by either role, unlike the two workspaces.
  if (pathname.startsWith("/account")) {
    return NextResponse.next();
  }

  const workspace = session.role === "manager" ? "/manager" : "/employee";
  if (!pathname.startsWith(workspace)) {
    return NextResponse.redirect(new URL(workspace, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/employee/:path*", "/manager/:path*", "/account/:path*"],
};
