/**
 * Studio V2 — Production Pattern Intelligence profile builder.
 * Consolidates Production Memory, Timeline, and Project Memory — no ML, no predictions.
 */

import {
  buildProductionMemoryProfile,
  detectProductionTypeFromIdea,
} from "@/lib/studio-production-memory-profile";
import { buildProductionTimeline } from "@/lib/studio-production-timeline";
import type { ProductionMemoryRecord } from "@/types/studio-production-memory";
import type {
  BuildProductionPatternProfileInput,
  ProductionPatternAssetCombination,
  ProductionPatternContext,
  ProductionPatternProfile,
} from "@/types/studio-production-pattern";
import type {
  ProductionTimelineMilestone,
  StudioProductionTimeline,
} from "@/types/studio-production-timeline";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

const MIN_COMBO_COUNT = 2;

const PATTERN_LABEL_BY_ID: Record<string, string> = {
  homecheff_promo: "studio.productionMemory.pattern.homecheffPromo",
  garden_promo: "studio.productionMemory.pattern.gardenPromo",
  designer_promo: "studio.productionMemory.pattern.designerPromo",
  affiliate_promo: "studio.productionMemory.pattern.affiliatePromo",
  sports_promo: "studio.productionMemory.pattern.sportsPromo",
  tutorial_promo: "studio.productionMemory.pattern.tutorialPromo",
  community_promo: "studio.productionMemory.pattern.communityPromo",
  generic_commercial: "studio.productionMemory.pattern.genericCommercial",
};

function patternLabelKey(id: string): string {
  return PATTERN_LABEL_BY_ID[id] ?? `studio.productionMemory.patternSignal.${id}`;
}

function resolveCharacterName(id: string, characters?: StudioCharacterListItem[]): string {
  return characters?.find((c) => c.id === id)?.name.trim() || id;
}

function resolveWorldName(id: string, worlds?: StudioWorldProfileListItem[]): string {
  return worlds?.find((w) => w.id === id)?.name.trim() || id;
}

function resolvePropName(id: string, props?: StudioPropListItem[]): string {
  return props?.find((p) => p.id === id)?.name.trim() || id;
}

function buildRecurringAssetCombinations(
  records: ProductionMemoryRecord[],
  characters?: StudioCharacterListItem[],
  worlds?: StudioWorldProfileListItem[]
): ProductionPatternAssetCombination[] {
  const counts = new Map<
    string,
    { characterId: string; worldId?: string; count: number }
  >();

  for (const record of records) {
    for (const characterId of record.characterIds) {
      if (record.dominantWorldIds.length === 0) {
        const key = `${characterId}::`;
        const entry = counts.get(key) ?? { characterId, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
        continue;
      }
      for (const worldId of record.dominantWorldIds) {
        const key = `${characterId}::${worldId}`;
        const entry = counts.get(key) ?? { characterId, worldId, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
    }
  }

  return [...counts.entries()]
    .filter(([, value]) => value.count >= MIN_COMBO_COUNT)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([key, value]) => {
      const characterName = resolveCharacterName(value.characterId, characters);
      const worldName = value.worldId ? resolveWorldName(value.worldId, worlds) : undefined;
      return {
        id: `combo-${key}`,
        characterId: value.characterId,
        characterName,
        worldId: value.worldId,
        worldName,
        storyboardCount: value.count,
        labelKey:
          value.worldId ?
            "studio.productionPattern.assetCombination.characterWorld"
          : "studio.productionPattern.assetCombination.characterOnly",
        params: {
          character: characterName,
          world: worldName ?? "",
          count: String(value.count),
        },
      };
    });
}

function buildRecurringProps(
  memory: StudioProjectMemorySnapshot,
  props?: StudioPropListItem[]
) {
  return Object.entries(memory.props)
    .filter(([, usage]) => usage.storyboardCount >= MIN_COMBO_COUNT)
    .sort((a, b) => b[1].storyboardCount - a[1].storyboardCount)
    .slice(0, 5)
    .map(([propId, usage]) => ({
      id: `prop-${propId}`,
      label: resolvePropName(propId, props),
      labelKey: "studio.productionPattern.recurring.prop",
      count: usage.storyboardCount,
      storyboardCount: usage.storyboardCount,
      params: { name: resolvePropName(propId, props) },
    }));
}

function buildDirectorContextLines(profile: ProductionPatternProfile): string[] {
  const lines: string[] = [`patterns:productions:${profile.totalProductions}`];

  if (profile.currentProductionType) {
    lines.push(`patterns:currentType:${profile.currentProductionType}`);
  }

  const topType = profile.recurringProductionTypes[0];
  if (topType) {
    lines.push(`patterns:topType:${topType.id}:${topType.matchCount}`);
  }

  if (profile.structureSummary) {
    lines.push(
      `patterns:avgScenes:${profile.structureSummary.averageSceneCount}`,
      `patterns:avgShots:${profile.structureSummary.averageShotCount}`,
      `patterns:avgDuration:${profile.structureSummary.averageDurationSeconds}s`
    );
  }

  const topRender = profile.recurringRenderStrategies[0];
  if (topRender) {
    lines.push(`patterns:render:${topRender.label}`);
  }

  const topWorld = profile.recurringWorlds[0];
  if (topWorld?.params?.name) {
    lines.push(`patterns:world:${topWorld.params.name}`);
  }

  return lines;
}

export function emptyProductionPatternProfile(): ProductionPatternProfile {
  return {
    version: 1,
    totalProductions: 0,
    currentProductionType: null,
    currentProductionTypeLabelKey: null,
    recurringProductionTypes: [],
    recurringStructures: [],
    recurringRenderStrategies: [],
    recurringWorlds: [],
    recurringAssetCombinations: [],
    recurringDurations: [],
    recurringShotCounts: [],
    recurringCharacters: [],
    recurringProps: [],
    structureSummary: null,
    directorContextLines: [],
  };
}

export function buildProductionPatternProfile(
  input: BuildProductionPatternProfileInput
): ProductionPatternProfile {
  if (!input.projectMemory) {
    const ideaType = input.currentIdea ? detectProductionTypeFromIdea(input.currentIdea) : null;
    return {
      ...emptyProductionPatternProfile(),
      currentProductionType: ideaType,
      currentProductionTypeLabelKey: ideaType ? patternLabelKey(ideaType) : null,
    };
  }

  const memoryProfile = buildProductionMemoryProfile({
    memory: input.projectMemory,
    currentIdea: input.currentIdea ?? input.storyboard?.aiDirectorPrompt,
    libraries: {
      characters: input.characters,
      worlds: input.worlds,
    },
  });

  const records = input.projectMemory.productionRecords ?? [];
  const currentType = detectProductionTypeFromIdea(
    input.currentIdea ?? input.storyboard?.aiDirectorPrompt ?? ""
  );

  const profile: ProductionPatternProfile = {
    version: 1,
    totalProductions: memoryProfile.totalProductions,
    currentProductionType: currentType,
    currentProductionTypeLabelKey: currentType ? patternLabelKey(currentType) : null,
    recurringProductionTypes: memoryProfile.productionPatterns,
    recurringStructures: memoryProfile.recurringStructures,
    recurringRenderStrategies: memoryProfile.recurringRenderStrategies,
    recurringWorlds: memoryProfile.recurringWorlds,
    recurringAssetCombinations: buildRecurringAssetCombinations(
      records,
      input.characters,
      input.worlds
    ),
    recurringDurations: memoryProfile.recurringDurations,
    recurringShotCounts: memoryProfile.recurringShotCounts,
    recurringCharacters: memoryProfile.topCharacters,
    recurringProps: buildRecurringProps(input.projectMemory, input.props),
    structureSummary:
      memoryProfile.totalProductions >= 2 ?
        {
          averageSceneCount: memoryProfile.averageSceneCount,
          averageShotCount: memoryProfile.averageShotCount,
          averageDurationSeconds: memoryProfile.averageDurationSeconds,
          labelKey: "studio.productionPattern.structure.summary",
          params: {
            scenes: String(memoryProfile.averageSceneCount),
            shots: String(memoryProfile.averageShotCount),
            seconds: String(memoryProfile.averageDurationSeconds),
          },
        }
      : null,
    directorContextLines: [],
  };

  profile.directorContextLines = buildDirectorContextLines(profile);
  return profile;
}

export function enrichTimelineWithPatternHints(
  timeline: StudioProductionTimeline,
  profile: ProductionPatternProfile
): StudioProductionTimeline {
  const topType = profile.recurringProductionTypes[0];
  if (!topType || topType.matchCount < MIN_COMBO_COUNT) {
    return timeline;
  }

  const hintParams = {
    pattern: topType.labelKey,
    count: String(topType.matchCount),
  };

  const milestones: ProductionTimelineMilestone[] = timeline.milestones.map((milestone) => {
    if (milestone.id !== "milestone-started" && milestone.id !== "milestone-first-scene") {
      return milestone;
    }
    return {
      ...milestone,
      patternHintKey: "studio.productionPattern.timeline.oftenUsed",
      patternHintParams: hintParams,
    };
  });

  return { ...timeline, milestones };
}

export function buildProductionPatternContext(
  input: BuildProductionPatternProfileInput
): ProductionPatternContext {
  const profile = buildProductionPatternProfile(input);
  const recommendationKeys: string[] = [];

  if (profile.currentProductionTypeLabelKey) {
    recommendationKeys.push("studio.productionPattern.guidance.currentType");
  }
  if (profile.recurringProductionTypes[0]) {
    recommendationKeys.push(profile.recurringProductionTypes[0].labelKey);
  }
  if (profile.structureSummary) {
    recommendationKeys.push("studio.productionPattern.structure.summary");
  }
  if (profile.recurringRenderStrategies[0]?.labelKey) {
    recommendationKeys.push(profile.recurringRenderStrategies[0].labelKey);
  }

  return {
    profile,
    contextLines: profile.directorContextLines,
    recommendationKeys: recommendationKeys.slice(0, 6),
  };
}

export function enrichIdeaWithProductionPattern(
  idea: string,
  context: ProductionPatternContext
): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const topType = context.profile.recurringProductionTypes[0];
  const typeHint =
    topType ?
      `Proven pattern: ${topType.id} (${topType.matchCount}×)`
    : "";
  const lines = [...context.contextLines, typeHint].filter(Boolean).join("; ");
  return `[Production patterns: ${lines}]\n${idea.trim()}`.trim();
}

export function buildProductionTimelineWithPatterns(
  input: BuildProductionPatternProfileInput
): StudioProductionTimeline {
  if (!input.storyboard) {
    return {
      version: 1,
      timelineEvents: [],
      milestones: [],
      decisionHistory: [],
      productionEvolution: [],
      recentCompletedKeys: [],
      directorContextLines: [],
    };
  }

  const timeline = buildProductionTimeline({
    storyboard: input.storyboard,
    characters: input.characters,
    locations: input.locations,
    props: input.props,
    worlds: input.worlds,
    projectMemory: input.projectMemory,
    assetDecisionRegistry: input.assetDecisionRegistry,
    directorApplyAudits: input.directorApplyAudits,
    directorApplyBaseline: input.directorApplyBaseline,
  });

  const profile = buildProductionPatternProfile(input);
  return enrichTimelineWithPatternHints(timeline, profile);
}
