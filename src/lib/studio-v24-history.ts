/**
 * Unified history and legacy-open targets.
 * These helpers do not create records or touch media.
 */

export const STUDIO_OPEN_KINDS = ["storyboard", "animation", "image", "character", "asset"] as const;
export type StudioOpenKind = (typeof STUDIO_OPEN_KINDS)[number];

export type StudioHistoryRole = "project" | "asset";
export type StudioHistoryAction =
  | "open"
  | "edit_image"
  | "open_video"
  | "open_animation"
  | "open_character"
  | "play"
  | "view";

export type StudioHistoryKind =
  | "film"
  | "animation"
  | "image"
  | "video"
  | "voice"
  | "audio"
  | "character"
  | "project"
  | "asset";

export function isStudioOpenKind(value: string): value is StudioOpenKind {
  return (STUDIO_OPEN_KINDS as readonly string[]).includes(value);
}

export function studioOpenPath(kind: StudioOpenKind, id: string): string {
  return `/studio/open/${kind}/${encodeURIComponent(id)}`;
}

export function creativeWorkflowForLegacy(kind: "storyboard" | "animation" | "image"): "film" | "video" | "image" {
  if (kind === "storyboard") return "film";
  if (kind === "animation") return "video";
  return "image";
}

export function unifiedProjectHref(projectId: string, workflow: "film" | "video" | "image"): string {
  return `/studio/projects/${encodeURIComponent(projectId)}?workflow=${workflow}`;
}

export function safePreviewUrl(value: string | null | undefined): string | null {
  const url = value?.trim() ?? "";
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("blob:")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch {
    return null;
  }
  return null;
}

export function historyPresentation(input: {
  sourceType: "creative" | "storyboard" | "animation" | "image" | "character" | "asset";
  creativeKind?: "film" | "animation" | "image" | "project" | null;
  family?: string | null;
}): { kind: StudioHistoryKind; role: StudioHistoryRole; editable: boolean; action: StudioHistoryAction } {
  if (input.sourceType === "character") {
    return { kind: "character", role: "project", editable: true, action: "open_character" };
  }
  if (input.sourceType === "image") {
    return { kind: "image", role: "project", editable: true, action: "edit_image" };
  }
  if (input.sourceType === "animation") {
    return { kind: "animation", role: "project", editable: true, action: "open_animation" };
  }
  if (input.sourceType === "storyboard" || (input.sourceType === "creative" && input.creativeKind === "film")) {
    return { kind: "film", role: "project", editable: true, action: "open" };
  }
  if (input.sourceType === "creative" && input.creativeKind === "animation") {
    return { kind: "animation", role: "project", editable: true, action: "open_animation" };
  }
  if (input.sourceType === "creative" && input.creativeKind === "image") {
    return { kind: "image", role: "project", editable: true, action: "edit_image" };
  }
  if (input.sourceType === "creative") {
    return { kind: "project", role: "project", editable: true, action: "open" };
  }
  const family = (input.family ?? "").toLowerCase();
  if (family === "voice") return { kind: "voice", role: "asset", editable: false, action: "play" };
  if (family === "music" || family === "sfx") return { kind: "audio", role: "asset", editable: false, action: "play" };
  if (family === "video") return { kind: "video", role: "asset", editable: false, action: "view" };
  if (family === "image") return { kind: "image", role: "asset", editable: false, action: "view" };
  return { kind: "asset", role: "asset", editable: false, action: "view" };
}

export function historyHref(input: {
  sourceType: "creative" | "storyboard" | "animation" | "image" | "character" | "asset";
  sourceId: string;
  creativeKind?: "film" | "animation" | "image" | "project" | null;
}): string {
  if (input.sourceType === "creative") {
    const workflow =
      input.creativeKind === "film"
        ? "film"
        : input.creativeKind === "animation"
          ? "video"
          : input.creativeKind === "image"
            ? "image"
            : "film";
    return unifiedProjectHref(input.sourceId, workflow);
  }
  if (input.sourceType === "character") return `/studio/characters/${encodeURIComponent(input.sourceId)}`;
  if (input.sourceType === "storyboard" || input.sourceType === "animation" || input.sourceType === "image" || input.sourceType === "asset") {
    return studioOpenPath(input.sourceType, input.sourceId);
  }
  return "/studio";
}
