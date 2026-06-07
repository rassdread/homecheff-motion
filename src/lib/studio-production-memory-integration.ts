/**
 * Merge production memory advisory recommendations into existing planners (no overrides).
 */

import { buildProductionMemoryProfile } from "@/lib/studio-production-memory-profile";
import type { StudioCharacterListItem, StudioWorldProfileListItem } from "@/types/studio-api";
import type { ProductionBriefRecommendation } from "@/types/studio-production-brief";
import type { ProductionRecommendation } from "@/types/studio-production-plan";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { ProductionMemoryProfile } from "@/types/studio-production-memory";
import type { SceneGenerationRecommendation } from "@/types/studio-scene-generation-plan";
import type { RenderStrategyReason } from "@/types/studio-render-strategy";

export function resolveProductionMemoryProfile(params: {
  projectMemory?: StudioProjectMemorySnapshot;
  currentIdea?: string;
  characters?: StudioCharacterListItem[];
  worlds?: StudioWorldProfileListItem[];
}): ProductionMemoryProfile | null {
  if (!params.projectMemory) {
    return null;
  }
  const profile = buildProductionMemoryProfile({
    memory: params.projectMemory,
    currentIdea: params.currentIdea,
    libraries: {
      characters: params.characters,
      worlds: params.worlds,
    },
  });
  if (profile.totalProductions === 0 && profile.topCharacters.length === 0) {
    return null;
  }
  return profile;
}

export function productionMemoryBriefRecommendations(
  profile: ProductionMemoryProfile | null
): ProductionBriefRecommendation[] {
  if (!profile) {
    return [];
  }
  const recs: ProductionBriefRecommendation[] = [];

  if (profile.creationGuidance) {
    recs.push({
      id: "memory-creation-guidance",
      messageKey: profile.creationGuidance.messageKey,
      messageParams: profile.creationGuidance.messageParams,
      priority: "medium",
    });
    if (profile.creationGuidance.startWithSuggestionKey) {
      recs.push({
        id: "memory-start-with",
        messageKey: profile.creationGuidance.startWithSuggestionKey,
        messageParams: profile.creationGuidance.startWithParams,
        priority: "low",
      });
    }
  }

  if (profile.recurringRenderStrategies[0]) {
    const render = profile.recurringRenderStrategies[0];
    recs.push({
      id: "memory-render-strategy",
      messageKey: "studio.productionMemory.recommendation.renderStrategy",
      messageParams: {
        strategy: render.labelKey ?? render.label,
        count: String(render.storyboardCount),
      },
      priority: "low",
    });
  }

  return recs.slice(0, 4);
}

export function productionMemoryPlannerRecommendations(
  profile: ProductionMemoryProfile | null
): ProductionRecommendation[] {
  if (!profile) {
    return [];
  }
  const recs: ProductionRecommendation[] = [];

  if (profile.averageDurationSeconds > 0) {
    recs.push({
      id: "memory-avg-duration",
      messageKey: "studio.productionMemory.planner.avgDuration",
      messageParams: {
        seconds: String(profile.averageDurationSeconds),
        count: String(profile.totalProductions),
      },
      priority: "low",
    });
  }

  if (profile.averageShotCount > 0) {
    recs.push({
      id: "memory-avg-shots",
      messageKey: "studio.productionMemory.planner.avgShots",
      messageParams: {
        shots: String(profile.averageShotCount),
        count: String(profile.totalProductions),
      },
      priority: "low",
    });
  }

  if (profile.recurringStructures[0]) {
    const structure = profile.recurringStructures[0];
    recs.push({
      id: "memory-structure",
      messageKey: structure.labelKey ?? "studio.productionMemory.planner.structure",
      messageParams: structure.params,
      priority: "low",
    });
  }

  return recs.slice(0, 3);
}

export function productionMemoryGenerationRecommendations(
  profile: ProductionMemoryProfile | null
): SceneGenerationRecommendation[] {
  if (!profile) {
    return [];
  }
  const recs: SceneGenerationRecommendation[] = [];

  if (profile.averageShotCount > 0) {
    recs.push({
      id: "memory-shot-count",
      messageKey: "studio.productionMemory.generation.avgShots",
      messageParams: {
        shots: String(profile.averageShotCount),
        count: String(profile.totalProductions),
      },
      toolId: "visual",
      priority: "low",
    });
  }

  const ctaProductions = (profile as ProductionMemoryProfile & { ctaRate?: number }).totalProductions;
  if (ctaProductions >= 2 && profile.recurringStructures.some((s) => s.label === "classic_arc")) {
    recs.push({
      id: "memory-cta-shot",
      messageKey: "studio.productionMemory.generation.ctaShot",
      priority: "low",
    });
  }

  return recs.slice(0, 2);
}

export function productionMemoryRenderReasons(
  profile: ProductionMemoryProfile | null
): RenderStrategyReason[] {
  if (!profile?.recurringRenderStrategies[0]) {
    return [];
  }
  const top = profile.recurringRenderStrategies[0];
  return [
    {
      id: "memory-render-preference",
      reasonKey: "studio.productionMemory.render.usuallyUses",
      reasonParams: {
        strategy: top.labelKey ?? top.label,
        count: String(top.storyboardCount),
      },
    },
  ];
}

export function mergeUniqueRecommendations<T extends { id: string }>(
  existing: T[],
  additions: T[],
  limit = 10
): T[] {
  const seen = new Set(existing.map((r) => r.id));
  const merged = [...existing];
  for (const rec of additions) {
    if (seen.has(rec.id)) {
      continue;
    }
    seen.add(rec.id);
    merged.push(rec);
  }
  return merged.slice(0, limit);
}
