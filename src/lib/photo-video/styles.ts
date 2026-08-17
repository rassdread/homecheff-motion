import type { PhotoVideoStyle } from "@/lib/photo-video/constants";

export type PhotoVideoTransitionKind = "crossfade" | "cut" | "slide";
export type PhotoVideoMotionKind = "zoom-in" | "zoom-out" | "pan";

export type PhotoVideoStyleRecipe = {
  overlapSeconds: number;
  transition: PhotoVideoTransitionKind;
  motionCycle: readonly PhotoVideoMotionKind[];
  motionStrength: number;
};

const RECIPES: Record<PhotoVideoStyle, PhotoVideoStyleRecipe> = {
  auto: {
    overlapSeconds: 0.4,
    transition: "crossfade",
    motionCycle: ["zoom-in", "pan", "zoom-out"],
    motionStrength: 0.08,
  },
  smooth: {
    overlapSeconds: 0.4,
    transition: "crossfade",
    motionCycle: ["zoom-in", "zoom-in"],
    motionStrength: 0.06,
  },
  calm: {
    overlapSeconds: 0.5,
    transition: "crossfade",
    motionCycle: ["zoom-out", "zoom-out"],
    motionStrength: 0.05,
  },
  energetic: {
    overlapSeconds: 0.2,
    transition: "cut",
    motionCycle: ["zoom-in", "pan"],
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
