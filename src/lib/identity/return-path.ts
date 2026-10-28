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
        const next = new URLSearchParams();
        next.set("storyboardId", storyboardId);
        const tool = params.get("tool")?.trim() ?? "";
        if (tool === "voice" || tool === "music" || tool === "sound") next.set("tool", tool);
        const scene = params.get("scene")?.trim() ?? "";
        if (scene && /^[a-zA-Z0-9_-]+$/.test(scene)) next.set("scene", scene);
        const idea = params.get("idea")?.trim() ?? "";
        if (idea && idea.length <= 500 && !/[\u0000-\u001f]/.test(idea)) next.set("idea", idea);
        return `/studio?${next.toString()}`;
      }
    } catch {
      /* fall through */
    }
  }

  const preserved = preservedHandoffSearch(pathname, search);
  if (preserved) return `${pathname}?${preserved}`;

  return pathname;
}

const IDEA_HANDOFF_PATHS = new Set([
  "/editor/start",
  "/motion",
  "/motion/start",
  "/studio/experience",
  "/studio/photo-video",
  "/studio/assets/media/voices",
  "/studio/assets/media/audio",
  "/studio/audio/create",
  "/studio/characters/new",
]);

/** Keeps the creative idea across an SSO return. Other query keys stay stripped. */
function preservedHandoffSearch(pathname: string, search: string): string {
  if (!search.startsWith("?")) return "";
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.slice(1));
  } catch {
    return "";
  }
  const next = new URLSearchParams();
  if (pathname === "/studio/photo-video" && params.get("resume") === "1") {
    next.set("resume", "1");
  }
  if (IDEA_HANDOFF_PATHS.has(pathname)) {
    const idea = params.get("idea")?.trim() ?? "";
    if (idea && idea.length <= 500 && !/[\u0000-\u001f]/.test(idea)) {
      next.set("idea", idea);
    }
  }
  if (pathname === "/studio/audio/create") {
    const mode = params.get("mode")?.trim() ?? "";
    if (mode === "voice" || mode === "music" || mode === "sfx") next.set("mode", mode);
    const storyboardId = params.get("storyboardId")?.trim() ?? "";
    if (storyboardId && /^[a-zA-Z0-9_-]+$/.test(storyboardId)) next.set("storyboardId", storyboardId);
    const scene = params.get("scene")?.trim() ?? "";
    if (scene && /^[a-zA-Z0-9_-]+$/.test(scene)) next.set("scene", scene);
  }
  return next.toString();
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
    p === "/studio/photo-video"
  );
}
