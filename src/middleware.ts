import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedApiOrigin } from "@/lib/allowed-api-origins";
import { HOMECHEFF_BRAND_ICON_PATHS } from "@/lib/homecheff-brand-icon";
import { logAuthCheck } from "@/server/auth/auth-check-log";
import { AUTH_COOKIE_NAMES } from "@/server/auth/cookie-names";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { canAttemptSilentSso } from "@/lib/identity/sso/silent-guard";

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

function applySafariFaviconLinkHeader(response: NextResponse): void {
  response.headers.append(
    "Link",
    `<${HOMECHEFF_BRAND_ICON_PATHS.favicon32}>; rel=icon; type=image/png; sizes=32x32`
  );
}

function handleApiMiddleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sessionExists = Boolean(
    request.cookies.get(AUTH_COOKIE_NAMES.studio)?.value ||
      request.cookies.get(AUTH_COOKIE_NAMES.legacy)?.value,
  );
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

/**
 * SP.2B.7 — hard redirect into silent hydrate before AppShell paints guest chrome.
 */
function maybePublicSilentHydrate(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname !== "/") return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const hasStudioSession = Boolean(
    request.cookies.get(AUTH_COOKIE_NAMES.studio)?.value ||
      request.cookies.get(AUTH_COOKIE_NAMES.legacy)?.value,
  );
  if (hasStudioSession) return null;
  if (!isCentralSsoLive()) return null;

  const cookieHeader = request.headers.get("cookie");
  if (!canAttemptSilentSso(cookieHeader)) return null;

  const url = request.nextUrl.clone();
  url.pathname = "/auth/sso/silent";
  url.search = "";
  url.searchParams.set("returnTo", "/");
  url.searchParams.set("mode", "public");
  return NextResponse.redirect(url, 307);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return handleApiMiddleware(request);
  }

  const silent = maybePublicSilentHydrate(request);
  if (silent) return silent;

  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  if (request.method === "GET" && acceptsHtml) {
    const response = NextResponse.next();
    applySafariFaviconLinkHeader(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|css|js|map|json|txt|xml|webmanifest)$).*)",
  ],
};
