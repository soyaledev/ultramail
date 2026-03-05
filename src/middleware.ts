import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

interface SessionData {
  isLoggedIn: boolean;
}

const panelRoutes = ["/templates", "/logs", "/actividad", "/settings", "/metricas"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPanel = panelRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isPanel) return NextResponse.next();

  const response = NextResponse.next();

  const session = await getIronSession<SessionData>(
    request,
    response,
    {
      password:
        process.env.SESSION_SECRET ??
        "fallback-secret-change-me-in-production-32",
      cookieName: "ultramail-session",
    }
  );

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/templates/:path*", "/logs/:path*", "/actividad/:path*", "/settings/:path*", "/metricas/:path*"],
};
