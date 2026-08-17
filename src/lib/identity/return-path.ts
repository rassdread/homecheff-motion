/**
 * SP.2B — safe Studio returnTo validation (no open redirects).
 */

export const DEFAULT_STUDIO_RETURN_TO = "/";

const ALLOWED_PREFIXES = [
  "/",
  "/studio",
  "/editor",
  "/animate",
  "/publish",
  "/videos",
  "/account",
  "/admin",
  "/maak",
  "/library",
  "/projects",
  "/mijn-verbruik",
  "/pricing",
  "/welcome",
  "/login",
  "/signup",
] as const;

function decodeOnce(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizePath(path: string): string {
  const noQuery = path.split("?")[0] ?? path;
  const parts = noQuery.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return "/" + stack.join("/");
}

/**
 * Normalize and validate an internal Studio path.
 * Preserves a safe query string only for `/studio?storyboardId=…`.
 */
export function validateStudioReturnTo(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== "string") return DEFAULT_STUDIO_RETURN_TO;
  const path = decodeOnce(raw.trim());
  if (!path) return DEFAULT_STUDIO_RETURN_TO;

  const lower = path.toLowerCase();
  if (
    path.includes("://") ||
    path.startsWith("//") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    path.includes("\\") ||
    path.includes("\n") ||
    path.includes("\r") ||
    !path.startsWith("/")
  ) {
    return DEFAULT_STUDIO_RETURN_TO;
  }

  const qIndex = path.indexOf("?");
  const pathname = normalizePath(qIndex >= 0 ? path.slice(0, qIndex) : path);
  const search = qIndex >= 0 ? path.slice(qIndex) : "";

  if (pathname === "/") {
    return "/";
  }

  const allowed = ALLOWED_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
  if (!allowed) return DEFAULT_STUDIO_RETURN_TO;

  if (pathname === "/studio" && search.startsWith("?")) {
    try {
      const params = new URLSearchParams(search.slice(1));
      const storyboardId = params.get("storyboardId")?.trim();
      if (storyboardId && /^[a-zA-Z0-9_-]+$/.test(storyboardId)) {
        return `/studio?storyboardId=${encodeURIComponent(storyboardId)}`;
      }
    } catch {
      /* fall through */
    }
  }

  if (pathname === "/studio/photo-video" && search.startsWith("?")) {
    try {
      const params = new URLSearchParams(search.slice(1));
      if (params.get("resume") === "1") {
        return "/studio/photo-video?resume=1";
      }
    } catch {
      /* fall through */
    }
  }

  return pathname;
}

/**
 * Surfaces that must stay public when silent SSO finds no HC session.
 * Used so login_required does not bounce anonymous visitors to /login.
 */
export function isPublicStudioSurface(path: string): boolean {
  const validated = validateStudioReturnTo(path);
  const p = validated.split("?")[0] ?? validated;
  return (
    p === "/" ||
    p === "/pricing" ||
    p.startsWith("/pricing/") ||
    p === "/studio/photo-video" ||
    p.startsWith("/studio/photo-video/")
  );
}
