/**
 * Slice 1B — selection-driven context actions for Photo Video Creator.
 */

export type PhotoVideoContextAction =
  | "text"
  | "motion"
  | "order"
  | "trim"
  | "fit"
  | "audio"
  | "style"
  | "position";

export type PhotoVideoContextMode = "none" | "photo" | "video" | "overlay";

export const PHOTO_CONTEXT_ACTIONS: readonly PhotoVideoContextAction[] = ["text", "motion", "order"];

export const VIDEO_CONTEXT_ACTIONS: readonly PhotoVideoContextAction[] = [
  "text",
  "trim",
  "fit",
  "audio",
  "order",
];

export const OVERLAY_CONTEXT_ACTIONS: readonly PhotoVideoContextAction[] = ["text", "style", "position"];

export function resolvePhotoVideoContextMode(input: {
  selectedPhotoId: string | null;
  selectedIsVideo: boolean;
  overlayFocused: boolean;
}): PhotoVideoContextMode {
  if (input.overlayFocused && input.selectedPhotoId) return "overlay";
  if (!input.selectedPhotoId) return "none";
  return input.selectedIsVideo ? "video" : "photo";
}

export function contextActionsForMode(mode: PhotoVideoContextMode): readonly PhotoVideoContextAction[] {
  if (mode === "photo") return PHOTO_CONTEXT_ACTIONS;
  if (mode === "video") return VIDEO_CONTEXT_ACTIONS;
  if (mode === "overlay") return OVERLAY_CONTEXT_ACTIONS;
  return [];
}

export function normalizeContextAction(
  mode: PhotoVideoContextMode,
  action: PhotoVideoContextAction
): PhotoVideoContextAction {
  const allowed = contextActionsForMode(mode);
  if (allowed.includes(action)) return action;
  return allowed[0] ?? "text";
}

export function defaultContextAction(mode: PhotoVideoContextMode): PhotoVideoContextAction {
  if (mode === "video") return "trim";
  if (mode === "overlay") return "text";
  if (mode === "photo") return "text";
  return "text";
}
