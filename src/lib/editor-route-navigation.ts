export type EditorRouteQuery = {
  session?: string;
  hcProject?: string;
  /** Remove restoreServer when syncing local-first routes (default true). */
  stripRestoreServer?: boolean;
};

export type EditorRouteReplaceReason =
  | "same_url"
  | "duplicate_url"
  | "rate_limit"
  | "stale_hc_removed"
  | "stale_session_removed"
  | "restore_server_removed"
  | "session_synced"
  | "hc_synced"
  | "route_cleared"
  | "applied";

export function normalizeEditorRouteUrl(pathWithSearch: string): string {
  let pathname = "/editor";
  let search = "";
  try {
    const url = pathWithSearch.includes("://")
      ? new URL(pathWithSearch)
      : new URL(pathWithSearch, "http://local");
    pathname = url.pathname.replace(/\/+$/, "") || "/editor";
    search = url.search;
  } catch {
    const qIndex = pathWithSearch.indexOf("?");
    pathname = qIndex >= 0 ? pathWithSearch.slice(0, qIndex) : pathWithSearch;
    search = qIndex >= 0 ? pathWithSearch.slice(qIndex) : "";
  }

  const params = new URLSearchParams(search);
  const canonical = new URLSearchParams();
  const session = params.get("session")?.trim();
  const hcProject = params.get("hcProject")?.trim();
  if (session) {
    canonical.set("session", session);
  }
  if (hcProject) {
    canonical.set("hcProject", hcProject);
  }
  const qs = canonical.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Editor workspace lives on /editor and /editor/start — keep the current path when syncing query params. */
export function resolveEditorRoutePathname(pathname?: string | null): string {
  const raw =
    pathname?.trim() ||
    (typeof window !== "undefined" ? window.location.pathname : "") ||
    "/editor";
  const normalized = raw.replace(/\/+$/, "") || "/editor";
  if (normalized === "/editor/start" || normalized.startsWith("/editor/start/")) {
    return "/editor/start";
  }
  return "/editor";
}

export function buildEditorRouteHref(
  query: EditorRouteQuery,
  currentSearch?: URLSearchParams | string,
  pathname?: string | null
): string {
  const basePath = resolveEditorRoutePathname(pathname);
  const params = new URLSearchParams();
  if (currentSearch) {
    const src =
      typeof currentSearch === "string"
        ? new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch)
        : new URLSearchParams(currentSearch.toString());
    for (const [key, value] of src.entries()) {
      if (key === "session" || key === "hcProject" || key === "restoreServer") {
        continue;
      }
      params.set(key, value);
    }
  }

  const session = query.session?.trim();
  const hcProject = query.hcProject?.trim();
  if (session) {
    params.set("session", session);
  }
  if (hcProject) {
    params.set("hcProject", hcProject);
  }

  const stripRestore = query.stripRestoreServer !== false;
  if (!stripRestore && currentSearch) {
    const src =
      typeof currentSearch === "string"
        ? new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch)
        : new URLSearchParams(currentSearch.toString());
    const restore = src.get("restoreServer")?.trim();
    if (restore) {
      params.set("restoreServer", restore);
    }
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function editorRouteSearchEquals(
  current: URLSearchParams | string,
  target: EditorRouteQuery
): boolean {
  const read = (key: string): string => {
    if (typeof current === "string") {
      return new URLSearchParams(current.startsWith("?") ? current.slice(1) : current).get(key)?.trim() ?? "";
    }
    return current.get(key)?.trim() ?? "";
  };
  const session = target.session?.trim() ?? "";
  const hcProject = target.hcProject?.trim() ?? "";
  const sessionMatch = read("session") === session;
  const hcMatch = read("hcProject") === hcProject;
  const restoreOk =
    target.stripRestoreServer === false ? true : read("restoreServer") === "";
  return sessionMatch && hcMatch && restoreOk;
}

export function editorRouteQueryNeedsSync(
  currentSearch: URLSearchParams | string,
  target: EditorRouteQuery
): boolean {
  const href = buildEditorRouteHref(target, currentSearch);
  if (typeof window !== "undefined") {
    const current = `${window.location.pathname}${window.location.search}`;
    if (normalizeEditorRouteUrl(current) === normalizeEditorRouteUrl(href)) {
      return false;
    }
  }
  return !editorRouteSearchEquals(currentSearch, target);
}

export function shouldReplaceEditorRoute(
  currentSearch: URLSearchParams | string,
  target: EditorRouteQuery
): boolean {
  return editorRouteQueryNeedsSync(currentSearch, target);
}

type ReplaceGuardState = {
  lastNormalizedTarget: string | null;
  lastAt: number;
  windowStart: number;
  windowCount: number;
  lastCause: string | null;
};

const replaceGuard: ReplaceGuardState = {
  lastNormalizedTarget: null,
  lastAt: 0,
  windowStart: 0,
  windowCount: 0,
  lastCause: null,
};

const MAX_REPLACES_PER_10S = 40;
const MIN_REPLACE_INTERVAL_MS = 32;

export function resetEditorRouteReplaceGuardForTests(): void {
  replaceGuard.lastNormalizedTarget = null;
  replaceGuard.lastAt = 0;
  replaceGuard.windowStart = 0;
  replaceGuard.windowCount = 0;
  replaceGuard.lastCause = null;
}

function logEditorRouteReplace(
  outcome: "skipped" | "applied",
  reason: EditorRouteReplaceReason,
  detail?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  console.debug("[editor.route]", outcome, reason, detail);
}

function evaluateReplaceGuard(
  normalizedTarget: string,
  cause: string
): { allowed: true } | { allowed: false; reason: EditorRouteReplaceReason } {
  const now = Date.now();
  if (replaceGuard.windowStart === 0 || now - replaceGuard.windowStart > 10_000) {
    replaceGuard.windowStart = now;
    replaceGuard.windowCount = 0;
  }

  if (typeof window !== "undefined") {
    const currentNormalized = normalizeEditorRouteUrl(
      `${window.location.pathname}${window.location.search}`
    );
    if (currentNormalized === normalizedTarget) {
      return { allowed: false, reason: "same_url" };
    }
  }

  if (
    replaceGuard.lastNormalizedTarget === normalizedTarget &&
    replaceGuard.lastCause === cause &&
    now - replaceGuard.lastAt < MIN_REPLACE_INTERVAL_MS
  ) {
    return { allowed: false, reason: "duplicate_url" };
  }

  if (replaceGuard.windowCount >= MAX_REPLACES_PER_10S) {
    return { allowed: false, reason: "rate_limit" };
  }

  return { allowed: true };
}

function markReplaceApplied(normalizedTarget: string, cause: string): void {
  replaceGuard.lastNormalizedTarget = normalizedTarget;
  replaceGuard.lastAt = Date.now();
  replaceGuard.windowCount += 1;
  replaceGuard.lastCause = cause;
}

export function safeReplaceEditorUrlString(
  href: string,
  reason: EditorRouteReplaceReason
): boolean {
  const normalizedTarget = normalizeEditorRouteUrl(href);
  const gate = evaluateReplaceGuard(normalizedTarget, reason);
  if (!gate.allowed) {
    logEditorRouteReplace("skipped", gate.reason, { href, normalizedTarget, cause: reason });
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  window.history.replaceState({}, "", href);
  markReplaceApplied(normalizedTarget, reason);
  logEditorRouteReplace("applied", reason === "applied" ? reason : reason, { href, normalizedTarget });
  return true;
}

export function safeReplaceEditorRoute(
  router: { replace: (href: string, options?: { scroll?: boolean }) => void },
  target: EditorRouteQuery,
  options: {
    currentSearch?: URLSearchParams | string;
    pathname?: string | null;
    reason: EditorRouteReplaceReason;
  }
): boolean {
  const href = buildEditorRouteHref(target, options.currentSearch, options.pathname);
  const normalizedTarget = normalizeEditorRouteUrl(href);
  const gate = evaluateReplaceGuard(normalizedTarget, options.reason);
  if (!gate.allowed) {
    logEditorRouteReplace("skipped", gate.reason, {
      href,
      normalizedTarget,
      cause: options.reason,
    });
    return false;
  }
  router.replace(href, { scroll: false });
  markReplaceApplied(normalizedTarget, options.reason);
  logEditorRouteReplace("applied", options.reason, { href, normalizedTarget });
  return true;
}

export function replaceEditorRouteIfNeeded(
  router: { replace: (href: string, options?: { scroll?: boolean }) => void },
  currentSearch: URLSearchParams | string,
  target: EditorRouteQuery,
  reason: EditorRouteReplaceReason = "session_synced",
  pathname?: string | null
): boolean {
  if (!editorRouteQueryNeedsSync(currentSearch, target)) {
    logEditorRouteReplace("skipped", "same_url", { target, reason });
    return false;
  }
  return safeReplaceEditorRoute(router, target, { currentSearch, pathname, reason });
}
