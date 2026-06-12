export const STUDIO_PRODUCT_START_PATHS = {
  editor: "/editor/start",
  studio: "/studio/start",
  motion: "/motion/start",
  publish: "/publish/start",
  library: "/library/start",
  usage: "/usage/start",
} as const;

export function editorLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(searchParams.get("session")?.trim() || searchParams.get("hcProject")?.trim());
}

export function studioLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(searchParams.get("storyboardId")?.trim() || searchParams.get("hcProject")?.trim());
}

export function publishLandingHasDeepLink(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("project")?.trim() ||
      searchParams.get("video")?.trim() ||
      searchParams.get("motion")?.trim() ||
      searchParams.get("editorSession")?.trim() ||
      searchParams.get("publishIntent")?.trim() ||
      searchParams.get("generationPackage")?.trim() ||
      searchParams.get("hcProject")?.trim() ||
      searchParams.get("handoffSource") === "editor_generation"
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
    "hcProject",
  ];
  return keys.some((key) => Boolean(searchParams.get(key)?.trim()));
}

export function libraryLandingHasDeepLink(pathname: string): boolean {
  return pathname.startsWith("/library/start") || pathname.startsWith("/studio/assets");
}
