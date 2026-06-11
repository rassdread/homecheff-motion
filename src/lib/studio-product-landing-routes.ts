export const STUDIO_PRODUCT_START_PATHS = {
  editor: "/editor/start",
  studio: "/studio/start",
  motion: "/motion/start",
  publish: "/publish/start",
  library: "/library/start",
  usage: "/usage/start",
} as const;

export function editorLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(searchParams.get("session")?.trim());
}

export function studioLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(searchParams.get("storyboardId")?.trim());
}

export function publishLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("project")?.trim() ||
      searchParams.get("video")?.trim() ||
      searchParams.get("motion")?.trim()
  );
}

export function motionLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  const keys = [
    "editorSession",
    "editorVariantId",
    "projectId",
    "draft",
    "import",
    "transformationSession",
  ];
  return keys.some((key) => Boolean(searchParams.get(key)?.trim()));
}

export function libraryLandingHasDeepLink(pathname: string): boolean {
  return pathname.startsWith("/library/start") || pathname.startsWith("/studio/assets");
}
