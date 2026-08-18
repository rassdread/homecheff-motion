import type { PhotoVideoStyle } from "@/lib/photo-video/constants";

export type { PhotoVideoTransitionKind } from "@/lib/photo-video/transition-kind";

/** Local canvas motion kinds — no provider/AI. */
export type PhotoVideoMotionKind =
  | "none"
  | "zoom-in"
  | "zoom-out"
  | "pan"
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down";

export const PHOTO_VIDEO_USER_MOTION_KINDS = [
  "auto",
  "none",
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "pan-up",
  "pan-down",
] as const;

export type PhotoVideoUserMotionKind = (typeof PHOTO_VIDEO_USER_MOTION_KINDS)[number];

export type PhotoVideoStyleRecipe = {
  overlapSeconds: number;
  motionCycle: readonly PhotoVideoMotionKind[];
  motionStrength: number;
};

const RECIPES: Record<PhotoVideoStyle, PhotoVideoStyleRecipe> = {
  auto: {
    overlapSeconds: 0.4,
    motionCycle: ["zoom-in", "pan-right", "zoom-out", "pan-left"],
    motionStrength: 0.08,
  },
  smooth: {
    overlapSeconds: 0.4,
    motionCycle: ["zoom-in", "zoom-in"],
    motionStrength: 0.06,
  },
  calm: {
    overlapSeconds: 0.5,
    motionCycle: ["zoom-out", "zoom-out"],
    motionStrength: 0.05,
  },
  energetic: {
    overlapSeconds: 0.2,
    motionCycle: ["zoom-in", "pan-right"],
    motionStrength: 0.12,
  },
};

export function styleRecipe(style: PhotoVideoStyle): PhotoVideoStyleRecipe {
  return RECIPES[style];
}

export function motionKindForIndex(style: PhotoVideoStyle, photoIndex: number): PhotoVideoMotionKind {
  const cycle = RECIPES[style].motionCycle;
  return cycle[photoIndex % cycle.length] ?? "zoom-in";
}

export function userMotionToKind(kind: PhotoVideoUserMotionKind): PhotoVideoMotionKind | null {
  if (kind === "auto" || kind === "none") return null;
  return kind;
}
