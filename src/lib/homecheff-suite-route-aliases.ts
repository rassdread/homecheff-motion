/**
 * Suite route aliases — user-facing /library and /publish map to stable internal routes.
 */

export const LIBRARY_HUB_BASE_PATH = "/studio/assets";
export const PUBLISH_ENTRY_PATH = "/publish";

export function resolveLibraryHubPath(segments: string[] = []): string {
  if (segments.length === 0) {
    return LIBRARY_HUB_BASE_PATH;
  }
  return `${LIBRARY_HUB_BASE_PATH}/${segments.map(encodeURIComponent).join("/")}`;
}

export function resolvePublishEntryPath(): string {
  return PUBLISH_ENTRY_PATH;
}

export function isLibraryAliasPath(pathname: string): boolean {
  return pathname === "/library" || pathname.startsWith("/library/");
}

export function isPublishAliasPath(pathname: string): boolean {
  return (
    pathname === "/publish" ||
    pathname.startsWith("/publish/") ||
    pathname === "/presentation" ||
    pathname.startsWith("/presentation/")
  );
}

export function libraryAliasToHubPath(pathname: string): string {
  if (pathname === "/library/start") {
    return LIBRARY_HUB_BASE_PATH;
  }
  if (pathname.startsWith("/library/start/")) {
    return `${LIBRARY_HUB_BASE_PATH}${pathname.slice("/library/start".length)}`;
  }
  if (pathname === "/library") {
    return "/library";
  }
  if (pathname.startsWith("/library/")) {
    return pathname;
  }
  return LIBRARY_HUB_BASE_PATH;
}

export function publishAliasToEntryPath(pathname: string): string {
  if (pathname === "/presentation" || pathname.startsWith("/presentation/")) {
    return pathname === "/presentation" ? "/publish" : pathname.replace(/^\/presentation/, "/publish");
  }
  if (pathname === "/publish" || pathname.startsWith("/publish/")) {
    return pathname;
  }
  return resolvePublishEntryPath();
}
