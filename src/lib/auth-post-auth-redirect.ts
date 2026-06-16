/** Default destination after login/signup when no valid `?next=` is provided. */
export const DEFAULT_POST_AUTH_PATH = "/";

const ALLOWED_EXACT = new Set([
  "/",
  "/maak",
  "/studio/projects",
  "/studio/storyboards",
  "/studio/storyboards/new",
  "/animate/instant",
  "/admin",
  "/mijn-verbruik",
  "/videos",
]);

const ALLOWED_PREFIXES = ["/videos/", "/admin/"];

export function isAllowedPostAuthPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  try {
    const url = new URL(path, "http://local");
    const pathname = url.pathname;

    if (ALLOWED_EXACT.has(pathname)) {
      return true;
    }

    if (pathname === "/studio") {
      const storyboardId = url.searchParams.get("storyboardId")?.trim();
      if (storyboardId) {
        return true;
      }
      return url.searchParams.size === 0;
    }

    return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

export function resolvePostAuthRedirect(nextParam: string | null | undefined): string {
  const next = nextParam?.trim();
  if (next === "/maak") {
    return "/";
  }
  if (next && isAllowedPostAuthPath(next)) {
    return next;
  }
  return DEFAULT_POST_AUTH_PATH;
}

export function resolvePostAuthRedirectFromSearch(search: string): string {
  return resolvePostAuthRedirect(new URLSearchParams(search).get("next"));
}
