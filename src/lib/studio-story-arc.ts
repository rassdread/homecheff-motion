/**
 * Studio V25 — narrative arc phase detection per scene position.
 */

import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";

export const STORY_ARC_PHASES = [
  "opening",
  "discovery",
  "build_up",
  "transition",
  "climax",
  "resolution",
  "outro",
] as const;

export type StoryArcPhase = (typeof STORY_ARC_PHASES)[number];

export type StoryArcEntry = {
  sceneId: string;
  order: number;
  title: string;
  phase: StoryArcPhase;
  phaseLabelKey: `studio.intelligence.arc.${StoryArcPhase}`;
};

/**
 * Map scene index to narrative arc phase from story length (structural heuristic).
 */
export function detectArcPhaseForIndex(index: number, sceneCount: number): StoryArcPhase {
  if (sceneCount <= 0) {
    return "opening";
  }
  if (sceneCount === 1) {
    return "opening";
  }
  if (sceneCount === 2) {
    return index === 0 ? "opening" : "resolution";
  }
  if (sceneCount === 3) {
    return index === 0 ? "opening" : index === 1 ? "build_up" : "resolution";
  }
  if (sceneCount === 4) {
    const phases: StoryArcPhase[] = ["opening", "discovery", "climax", "resolution"];
    return phases[index] ?? "resolution";
  }
  if (sceneCount === 5) {
    const phases: StoryArcPhase[] = [
      "opening",
      "discovery",
      "build_up",
      "climax",
      "resolution",
    ];
    return phases[index] ?? "resolution";
  }

  const t = index / Math.max(1, sceneCount - 1);
  if (t <= 0.12) {
    return "opening";
  }
  if (t <= 0.28) {
    return "discovery";
  }
  if (t <= 0.48) {
    return "build_up";
  }
  if (t <= 0.58) {
    return "transition";
  }
  if (t <= 0.78) {
    return "climax";
  }
  if (t <= 0.92) {
    return "resolution";
  }
  return "outro";
}

export function buildStoryArc(scenes: StoryFlowSceneInput[]): StoryArcEntry[] {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  const count = ordered.length;
  return ordered.map((scene, index) => {
    const phase = detectArcPhaseForIndex(index, count);
    return {
      sceneId: scene.sceneId,
      order: scene.order,
      title: scene.title,
      phase,
      phaseLabelKey: `studio.intelligence.arc.${phase}`,
    };
  });
}

export function climaxSceneIndex(scenes: StoryFlowSceneInput[]): number {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  return ordered.findIndex((_, i) => detectArcPhaseForIndex(i, ordered.length) === "climax");
}
