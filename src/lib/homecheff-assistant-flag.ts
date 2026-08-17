/**
 * HomeCheff Assistant V1 — conversational navigation assistant.
 * Set NEXT_PUBLIC_HOMECHEFF_ASSISTANT=false to hide without removing code paths.
 */

/** Exact pathname matches (homepage + library hub). */
export const HOMECHEFF_ASSISTANT_EXACT_ROUTES = ["/", "/library"] as const;

/** Prefix matches — any path equal to or nested under these roots. */
export const HOMECHEFF_ASSISTANT_ROUTE_PREFIXES = [
  "/studio",
  "/editor",
  "/animate",
  "/motion",
  "/publish",
  "/presentation",
  "/projects",
  "/usage",
  "/mijn-verbruik",
  "/account/usage",
  "/library",
] as const;

export function isHomeCheffAssistantEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_HOMECHEFF_ASSISTANT?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}

export function normalizeAssistantRoutePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  const withoutHash = withoutQuery.split("#")[0] ?? withoutQuery;
  if (!withoutHash || withoutHash === "/") {
    return "/";
  }
  return withoutHash.endsWith("/") ? withoutHash.slice(0, -1) : withoutHash;
}

export function isHomeCheffAssistantRoute(pathname: string): boolean {
  const path = normalizeAssistantRoutePathname(pathname);

  if (path === "/studio/photo-video/from-item" || path.startsWith("/studio/photo-video/from-item/")) {
    return false;
  }

  if ((HOMECHEFF_ASSISTANT_EXACT_ROUTES as readonly string[]).includes(path)) {
    return true;
  }

  return HOMECHEFF_ASSISTANT_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}
