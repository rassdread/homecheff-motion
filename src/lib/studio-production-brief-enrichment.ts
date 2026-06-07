/**
 * Enrich user idea with structured production brief context (no circular deps).
 */

import type { StudioProductionBrief } from "@/types/studio-production-brief";

export function enrichIdeaWithProductionBrief(idea: string, brief: StudioProductionBrief): string {
  const context = [
    `[brief: ${brief.goal}]`,
    `[duration: ${brief.estimatedDurationSeconds}s, ${brief.storyPreview.estimatedSceneCount} scenes, ${brief.storyPreview.estimatedShotCount} shots]`,
    `[style: ${brief.targetStyle.directorProfile}, action: ${brief.actionIntensity}]`,
    brief.world ? `[world: ${brief.world.name}]` : "",
    brief.mainCharacters.length > 0
      ? `[characters: ${brief.mainCharacters.map((c) => c.name).join(", ")}]`
      : "",
    brief.callToAction ? `[cta: ${brief.callToAction}]` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${context}\n${idea}`.trim();
}
