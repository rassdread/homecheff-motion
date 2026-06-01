export const INSTANT_MODES = ["transition", "story"] as const;
export type InstantMode = (typeof INSTANT_MODES)[number];

export const INSTANT_TRANSITION_SECONDS_OPTIONS = [3, 5, 8] as const;
export type InstantTransitionSeconds = (typeof INSTANT_TRANSITION_SECONDS_OPTIONS)[number];

export const MAX_STORY_MODE_IMAGES = 9;
export const MIN_STORY_MODE_IMAGES = 2;
export const MIN_TRANSITION_MODE_IMAGES = 2;
export const MAX_TRANSITION_MODE_IMAGES = 5;

export type InstantSceneText = {
  title: string;
  subtitle: string;
};

export function isInstantMode(value: unknown): value is InstantMode {
  return value === "transition" || value === "story";
}

export function isInstantTransitionSeconds(value: unknown): value is InstantTransitionSeconds {
  return value === 3 || value === 5 || value === 8;
}

export function parseInstantMode(value: unknown): InstantMode {
  return isInstantMode(value) ? value : "transition";
}

export function normalizeInstantTransitionSeconds(value: unknown): InstantTransitionSeconds {
  return isInstantTransitionSeconds(value) ? value : 5;
}

export function getInstantTransitionCount(imageCount: number): number {
  return Math.max(0, imageCount - 1);
}

export function getInstantOutputDurationSeconds(
  imageCount: number,
  transitionSeconds: InstantTransitionSeconds
): number {
  return getInstantTransitionCount(imageCount) * transitionSeconds;
}

export function maxImagesForInstantMode(mode: InstantMode): number {
  return mode === "story" ? MAX_STORY_MODE_IMAGES : MAX_TRANSITION_MODE_IMAGES;
}

export function minImagesForInstantMode(mode: InstantMode): number {
  return mode === "story" ? MIN_STORY_MODE_IMAGES : MIN_TRANSITION_MODE_IMAGES;
}

export function parseInstantSceneTexts(raw: unknown): InstantSceneText[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    if (!item || typeof item !== "object") {
      return { title: "", subtitle: "" };
    }
    const o = item as Record<string, unknown>;
    return {
      title: typeof o.title === "string" ? o.title.trim() : "",
      subtitle: typeof o.subtitle === "string" ? o.subtitle.trim() : "",
    };
  });
}

/** Vidu multiframe accepts 2–7s per segment; cinematic 8s maps to 7. */
export function viduMultiframeSegmentDurationSeconds(
  transitionSeconds: InstantTransitionSeconds
): number {
  return Math.min(7, Math.max(2, transitionSeconds));
}

/** Actual Vidu multiframe output length (sum of segment durations). */
export function viduMultiframeTotalDurationSeconds(
  imageCount: number,
  transitionSeconds: InstantTransitionSeconds
): number {
  const segments = getInstantTransitionCount(imageCount);
  if (segments <= 0) {
    return 0;
  }
  return segments * viduMultiframeSegmentDurationSeconds(transitionSeconds);
}
