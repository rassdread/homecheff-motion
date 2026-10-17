/**
 * Preview deployments share NEXT_PUBLIC_APP_URL with production.
 * Auth redirects must stay on the Preview host that received the request.
 * Production (VERCEL_ENV !== "preview") keeps the configured public origin.
 */

const PREVIEW_HOST =
  /^homecheff-motion(?:-[a-z0-9-]+)?\.vercel\.app$/;

export function previewNavigationOrigin(input: {
  vercelEnv: string | undefined;
  forwardedHost: string | null;
  forwardedProto: string | null;
  requestUrl: string;
}): string | null {
  if (input.vercelEnv !== "preview") return null;
  const host = previewHost(input.forwardedHost, input.requestUrl);
  if (!host) return null;
  const protoHeader = input.forwardedProto?.split(",")[0]?.trim().toLowerCase();
  const proto = protoHeader === "http" || protoHeader === "https" ? protoHeader : "https";
  return `${proto}://${host}`;
}

function previewHost(forwardedHost: string | null, requestUrl: string): string | null {
  const forwarded = firstHost(forwardedHost);
  if (forwarded && PREVIEW_HOST.test(forwarded)) return forwarded;
  try {
    const urlHost = new URL(requestUrl).host.toLowerCase();
    if (PREVIEW_HOST.test(urlHost)) return urlHost;
  } catch {
    return null;
  }
  return null;
}

function firstHost(value: string | null): string {
  return value?.split(",")[0]?.trim().toLowerCase() ?? "";
}

export function navigationOriginForRequest(req: Request): string {
  const preview = previewNavigationOrigin({
    vercelEnv: process.env.VERCEL_ENV,
    forwardedHost: req.headers.get("x-forwarded-host"),
    forwardedProto: req.headers.get("x-forwarded-proto"),
    requestUrl: req.url,
  });
  if (preview) return preview;
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

/** Unauthenticated Preview visitors stay on this host. Private paths go to login. */
export function previewUnauthenticatedLocation(input: {
  origin: string;
  returnTo: string;
  publicSurface: boolean;
}): string {
  const path = input.publicSurface
    ? input.returnTo
    : `/login?next=${encodeURIComponent(input.returnTo)}`;
  return new URL(path, input.origin).toString();
}

export function centralSsoStaysOnRequestHost(input: {
  vercelEnv: string | undefined;
  requestOrigin: string | null;
  callbackUri: string | null;
}): boolean {
  if (input.vercelEnv !== "preview") return true;
  if (!input.requestOrigin || !input.callbackUri) return false;
  try {
    return new URL(input.callbackUri).host === new URL(input.requestOrigin).host;
  } catch {
    return false;
  }
}

export function shouldUsePreviewHostPasswordLogin(input: {
  vercelEnv: string | undefined;
  centralSsoLive: boolean;
}): boolean {
  return input.vercelEnv === "preview" && !input.centralSsoLive;
}
