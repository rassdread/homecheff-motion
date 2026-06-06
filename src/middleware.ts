import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedApiOrigin } from "@/lib/allowed-api-origins";
import { logAuthCheck } from "@/server/auth/auth-check-log";

function originMatchesRequestHost(request: NextRequest, origin: string): boolean {
  const host = request.headers.get("host");
  if (!host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function shouldAllowApiOrigin(request: NextRequest, origin: string | null): origin is string {
  if (!origin) {
    return false;
  }
  return isAllowedApiOrigin(origin) || originMatchesRequestHost(request, origin);
}

function applyApiCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  origin: string | null
): void {
  if (!shouldAllowApiOrigin(request, origin)) {
    return;
  }
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.append("Vary", "Origin");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const sessionExists = Boolean(request.cookies.get("hc_session")?.value);
  logAuthCheck({
    pathname,
    sessionExists,
    userId: null,
    status: "middleware",
  });

  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    applyApiCorsHeaders(preflight, request, origin);
    preflight.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    );
    preflight.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return preflight;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hc-pathname", pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyApiCorsHeaders(response, request, origin);
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
