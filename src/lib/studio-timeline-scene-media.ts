/**
 * Scene clips on the film timeline are storyboard references.
 * They are not generated videos. A completed scene still may
 * still be shown for the clip window when no video URL exists.
 */

export function ownedSceneStillUrl(input: {
  selectedImageUrl: string | null | undefined;
  completedImageUrls: Array<string | null | undefined>;
}): string | null {
  const selected = input.selectedImageUrl?.trim() ?? "";
  if (selected) return selected;
  for (const candidate of input.completedImageUrls) {
    const url = candidate?.trim() ?? "";
    if (url) return url;
  }
  return null;
}

export type FilmClipVisualState =
  | "playable_video"
  | "playable_image"
  | "scene_awaiting_video"
  | "missing_media";

export function filmClipVisualState(input: {
  playbackUrl: string | null | undefined;
  stillUrl: string | null | undefined;
  sourceKind: string;
}): FilmClipVisualState {
  if (input.playbackUrl?.trim()) return "playable_video";
  if (input.stillUrl?.trim()) return "playable_image";
  if (input.sourceKind === "scene") return "scene_awaiting_video";
  return "missing_media";
}

export function filmClipMediaKind(state: FilmClipVisualState): "media" | "still" | "reference" {
  if (state === "playable_video") return "media";
  if (state === "playable_image") return "still";
  return "reference";
}
