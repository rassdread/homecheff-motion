import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedApiOrigin } from "@/lib/allowed-api-origins";
import { HOMECHEFF_BRAND_ICON_PATHS } from "@/lib/homecheff-brand-icon";
import { logAuthCheck } from "@/server/auth/auth-check-log";
import { AUTH_COOKIE_NAMES } from "@/server/auth/cookie-names";
import {
  countryFromRequestHeaders,
  ECOSYSTEM_LOCALE_COOKIE,
  ECOSYSTEM_LOCALE_PREF_COOKIE,
  MARKETPLACE_LEGACY_LOCALE_COOKIE,
  ecosystemLocaleCookieAttributes,
  parseEcosystemLanguage,
  resolveEcosystemLanguage,
  shouldUseSharedHomecheffLocaleDomain,
} from "@/lib/ecosystem-locale";

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

function resolveRequestLocale(request: NextRequest): "nl" | "en" {
  const eco = parseEcosystemLanguage(request.cookies.get(ECOSYSTEM_LOCALE_COOKIE)?.value);
  const legacy = parseEcosystemLanguage(
    request.cookies.get(MARKETPLACE_LEGACY_LOCALE_COOKIE)?.value ??
      request.cookies.get("hc_locale")?.value,
  );
  const cookieLanguage = eco ?? legacy;
  const prefFlag = request.cookies.get(ECOSYSTEM_LOCALE_PREF_COOKIE)?.value;
  const countryCode = countryFromRequestHeaders((n) => request.headers.get(n));
  return resolveEcosystemLanguage({
    explicitLanguage: prefFlag === "1" ? cookieLanguage : null,
    cookieLanguage,
    countryCode,
  });
}

function applyLocaleSeed(request: NextRequest, response: NextResponse, lang: "nl" | "en"): void {
  const hasCookie =
    parseEcosystemLanguage(request.cookies.get(ECOSYSTEM_LOCALE_COOKIE)?.value) ||
    parseEcosystemLanguage(request.cookies.get(MARKETPLACE_LEGACY_LOCALE_COOKIE)?.value) ||
    parseEcosystemLanguage(request.cookies.get("hc_locale")?.value);
  if (hasCookie) return;

  const host = request.headers.get("host") || "";
  const domain = shouldUseSharedHomecheffLocaleDomain(host) ? ".homecheff.eu" : undefined;
  for (const c of ecosystemLocaleCookieAttributes({
    language: lang,
    explicit: false,
    domain,
    secure: true,
  })) {
    response.cookies.set(c.name, c.value, {
      path: c.path,
      sameSite: c.sameSite,
      maxAge: c.maxAge,
      secure: c.secure,
      ...(c.domain ? { domain: c.domain } : {}),
    });
  }
  response.cookies.set(MARKETPLACE_LEGACY_LOCALE_COOKIE, lang, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400,
    secure: true,
    ...(domain ? { domain } : {}),
  });
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
  const lang = resolveRequestLocale(request);
  requestHeaders.set("x-hc-locale", lang);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyApiCorsHeaders(response, request, origin);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return handleApiMiddleware(request);
  }

  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  if (request.method === "GET" && acceptsHtml) {
    const lang = resolveRequestLocale(request);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-hc-locale", lang);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applySafariFaviconLinkHeader(response);
    applyLocaleSeed(request, response, lang);
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
