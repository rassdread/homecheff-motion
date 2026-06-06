/**
 * Studio V2 — unified asset evolution layer.
 * Aggregates project memory, recurring detection, director proposal, readiness, visual, shot planner.
 */

import { buildReadinessFixActions } from "@/lib/studio-consistency-fix-suggestions";
import { collectProposalSceneAssets } from "@/lib/studio-director-proposal-readiness";
import { buildDirectorMemorySuggestions } from "@/lib/studio-director-proposal-memory";
import { findRecurringMatchesForIdea } from "@/lib/studio-recurring-asset-detection";
import { getAssetUsageStats } from "@/lib/studio-project-memory-utils";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import { buildCurrentStoryboardShotPlan } from "@/lib/studio-shot-planner";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  AssetEvolutionAdvice,
  AssetEvolutionCompare,
  AssetEvolutionEntry,
  AssetEvolutionKind,
  AssetEvolutionSection,
  AssetEvolutionStatus,
  StoryboardAssetEvolution,
} from "@/types/studio-asset-evolution";
import type { StudioDirectorProposal } from "@/types/studio-director-proposal";

const KINDS: AssetEvolutionKind[] = ["character", "location", "prop", "world"];

function entryId(kind: AssetEvolutionKind, id: string): string {
  return `${kind}:${id}`;
}

function ideaFromStoryboard(storyboard: StudioStoryboardDetail): string {
  return `${storyboard.title} ${storyboard.description} ${storyboard.aiDirectorPrompt}`.trim();
}

function presentCharacters(storyboard: StudioStoryboardDetail): AssetEvolutionEntry[] {
  const map = new Map<string, AssetEvolutionEntry>();
  for (const scene of storyboard.scenes) {
    for (const character of scene.characters) {
      const existing = map.get(character.id);
      if (existing) {
        existing.sceneOrders?.push(scene.order);
        continue;
      }
      map.set(character.id, {
        id: entryId("character", character.id),
        name: character.name,
        status: "present",
        reasonKeys: [],
        existingId: character.id,
        sceneOrders: [scene.order],
      });
    }
  }
  return [...map.values()];
}

function presentLocations(storyboard: StudioStoryboardDetail): AssetEvolutionEntry[] {
  const map = new Map<string, AssetEvolutionEntry>();
  for (const scene of storyboard.scenes) {
    const loc = scene.location;
    const locId = scene.locationId ?? loc?.id;
    if (!locId) {
      continue;
    }
    const name = loc?.name ?? locId;
    const existing = map.get(locId);
    if (existing) {
      existing.sceneOrders?.push(scene.order);
      continue;
    }
    map.set(locId, {
      id: entryId("location", locId),
      name,
      status: "present",
      reasonKeys: [],
      existingId: locId,
      sceneOrders: [scene.order],
    });
  }
  return [...map.values()];
}

function presentProps(storyboard: StudioStoryboardDetail): AssetEvolutionEntry[] {
  const map = new Map<string, AssetEvolutionEntry>();
  for (const scene of storyboard.scenes) {
    for (const prop of scene.props ?? []) {
      const existing = map.get(prop.id);
      if (existing) {
        existing.sceneOrders?.push(scene.order);
        continue;
      }
      map.set(prop.id, {
        id: entryId("prop", prop.id),
        name: prop.name,
        status: "present",
        reasonKeys: [],
        existingId: prop.id,
        sceneOrders: [scene.order],
      });
    }
  }
  return [...map.values()];
}

function presentWorlds(storyboard: StudioStoryboardDetail): AssetEvolutionEntry[] {
  const map = new Map<string, AssetEvolutionEntry>();
  for (const scene of storyboard.scenes) {
    const worldIds: Array<{ id: string; name: string }> = [];
    for (const character of scene.characters) {
      if (character.worldProfile?.id) {
        worldIds.push({ id: character.worldProfile.id, name: character.worldProfile.name });
      }
    }
    if (scene.location?.worldProfile?.id) {
      worldIds.push({
        id: scene.location.worldProfile.id,
        name: scene.location.worldProfile.name,
      });
    }
    for (const world of worldIds) {
      const existing = map.get(world.id);
      if (existing) {
        existing.sceneOrders?.push(scene.order);
        continue;
      }
      map.set(world.id, {
        id: entryId("world", world.id),
        name: world.name,
        status: "present",
        reasonKeys: [],
        existingId: world.id,
        sceneOrders: [scene.order],
      });
    }
  }
  return [...map.values()];
}

function presentForKind(
  kind: AssetEvolutionKind,
  storyboard: StudioStoryboardDetail
): AssetEvolutionEntry[] {
  switch (kind) {
    case "character":
      return presentCharacters(storyboard);
    case "location":
      return presentLocations(storyboard);
    case "prop":
      return presentProps(storyboard);
    case "world":
      return presentWorlds(storyboard);
  }
}

function kindToMemoryKey(
  kind: AssetEvolutionKind
): "characters" | "locations" | "props" | "worlds" {
  if (kind === "character") {
    return "characters";
  }
  if (kind === "location") {
    return "locations";
  }
  if (kind === "prop") {
    return "props";
  }
  return "worlds";
}

function recurringKindToEvolution(kind: string): AssetEvolutionKind | null {
  if (kind === "character" || kind === "location" || kind === "prop" || kind === "world") {
    return kind;
  }
  return null;
}

function recommendedFromRecurring(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): Map<AssetEvolutionKind, AssetEvolutionEntry[]> {
  const result = new Map<AssetEvolutionKind, AssetEvolutionEntry[]>();
  for (const kind of KINDS) {
    result.set(kind, []);
  }

  const presentIds = new Set<string>();
  for (const kind of KINDS) {
    for (const item of presentForKind(kind, params.storyboard)) {
      if (item.existingId) {
        presentIds.add(`${kind}:${item.existingId}`);
      }
    }
  }

  const matches = findRecurringMatchesForIdea({
    idea: ideaFromStoryboard(params.storyboard),
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
    memory: params.memory,
  });

  for (const match of matches) {
    const kind = recurringKindToEvolution(match.kind);
    if (!kind || presentIds.has(`${kind}:${match.assetId}`)) {
      continue;
    }
    result.get(kind)?.push({
      id: entryId(kind, match.assetId),
      name: match.assetName,
      status: "recommended",
      reasonKeys: ["studio.assetEvolution.reuseRecommended", ...match.matchReasonKeys],
      existingId: match.assetId,
      usageStoryboardCount: match.usage.storyboardCount,
      usageRenderCount: match.usage.renderCount,
    });
  }

  return result;
}

function recommendedFromFixes(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
}): Map<AssetEvolutionKind, AssetEvolutionEntry[]> {
  const result = new Map<AssetEvolutionKind, AssetEvolutionEntry[]>();
  for (const kind of KINDS) {
    result.set(kind, []);
  }

  const readiness = buildStudioUnifiedReadiness({
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
  });
  const fixes = buildReadinessFixActions({
    storyboard: params.storyboard,
    checks: readiness.checks,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
  });

  const presentIds = new Set<string>();
  for (const kind of KINDS) {
    for (const item of presentForKind(kind, params.storyboard)) {
      if (item.existingId) {
        presentIds.add(`${kind}:${item.existingId}`);
      }
    }
  }

  for (const fix of fixes) {
    const kind =
      fix.checkId === "characters" ? "character"
      : fix.checkId === "location" ? "location"
      : fix.checkId === "world" ? "world"
      : null;
    if (!kind || !fix.suggestedAssetId) {
      continue;
    }
    if (presentIds.has(`${kind}:${fix.suggestedAssetId}`)) {
      continue;
    }
    const list = result.get(kind)!;
    if (list.some((e) => e.existingId === fix.suggestedAssetId)) {
      continue;
    }
    list.push({
      id: entryId(kind, fix.suggestedAssetId),
      name: fix.suggestedLabel,
      status: "recommended",
      reasonKeys: [
        "studio.assetEvolution.reuseRecommended",
        fix.suggestionKey ?? fix.issueKey,
      ].filter(Boolean),
      existingId: fix.suggestedAssetId,
      sceneOrders: fix.sceneOrder !== undefined ? [fix.sceneOrder] : undefined,
    });
  }

  return result;
}

function missingSceneGaps(storyboard: StudioStoryboardDetail): {
  characters: number[];
  locations: number[];
} {
  const characters: number[] = [];
  const locations: number[] = [];
  for (const scene of storyboard.scenes) {
    if (scene.characters.length === 0) {
      characters.push(scene.order);
    }
    if (!scene.locationId && !scene.location) {
      locations.push(scene.order);
    }
  }
  return { characters, locations };
}

function buildMissingEntries(
  kind: AssetEvolutionKind,
  sceneOrders: number[]
): AssetEvolutionEntry[] {
  if (sceneOrders.length === 0) {
    return [];
  }
  return [
    {
      id: entryId(kind, "gap"),
      name: "",
      status: "missing",
      reasonKeys: ["studio.assetEvolution.stillMissing"],
      sceneOrders,
    },
  ];
}

export function buildStoryboardAssetEvolution(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): StoryboardAssetEvolution {
  const recurring = recommendedFromRecurring(params);
  const fixes = recommendedFromFixes(params);
  const gaps = missingSceneGaps(params.storyboard);

  const sections: AssetEvolutionSection[] = KINDS.map((kind) => {
    const present = presentForKind(kind, params.storyboard);
    const recommendedMap = new Map<string, AssetEvolutionEntry>();

    for (const entry of [...(recurring.get(kind) ?? []), ...(fixes.get(kind) ?? [])]) {
      const key = entry.existingId ?? entry.name;
      if (!recommendedMap.has(key)) {
        recommendedMap.set(key, entry);
      }
    }

    let missing: AssetEvolutionEntry[] = [];
    if (kind === "character") {
      missing = buildMissingEntries("character", gaps.characters);
    } else if (kind === "location") {
      missing = buildMissingEntries("location", gaps.locations);
    } else if (kind === "world" && present.length === 0 && params.worlds.length > 0) {
      missing = [
        {
          id: entryId("world", "gap"),
          name: "",
          status: "missing",
          reasonKeys: ["studio.assetEvolution.stillMissing"],
        },
      ];
    }

    return {
      kind,
      present,
      recommended: [...recommendedMap.values()],
      missing,
    };
  });

  return {
    sections,
    continuityAdvice: analyzeAssetEvolutionContinuity(params),
    visualGaps: buildVisualProductionAssetGaps(params.storyboard),
    shotAdvice: buildShotPlannerAssetAdvice(params.storyboard),
  };
}

export function buildAssetEvolutionFromProposal(params: {
  proposal: StudioDirectorProposal;
  memory?: StudioProjectMemorySnapshot;
}): StoryboardAssetEvolution {
  const linked = collectProposalSceneAssets(params.proposal.scenes);

  const sectionForKind = (kind: AssetEvolutionKind): AssetEvolutionSection => {
    const present: AssetEvolutionEntry[] = [];
    const recommended: AssetEvolutionEntry[] = [];
    const missing: AssetEvolutionEntry[] = [];

    const addPresent = (id: string, name: string) => {
      if (!present.some((e) => e.existingId === id)) {
        present.push({
          id: entryId(kind, id),
          name,
          status: "present",
          reasonKeys: [],
          existingId: id,
        });
      }
    };

    if (kind === "character") {
      for (const c of linked.characters) {
        addPresent(c.id, c.name);
      }
      for (const scene of params.proposal.scenes) {
        for (const item of scene.proposedCharacters) {
          missing.push({
            id: entryId("character", item.tempId),
            name: item.name,
            status: "missing",
            reasonKeys: [item.reasonKey, "studio.assetEvolution.stillMissing"],
            isNewSuggestion: true,
          });
        }
      }
    }

    if (kind === "location") {
      for (const l of linked.locations) {
        addPresent(l.id, l.name);
      }
      for (const scene of params.proposal.scenes) {
        if (scene.proposedLocation) {
          missing.push({
            id: entryId("location", scene.proposedLocation.tempId),
            name: scene.proposedLocation.name,
            status: "missing",
            reasonKeys: [scene.proposedLocation.reasonKey, "studio.assetEvolution.stillMissing"],
            isNewSuggestion: true,
          });
        }
      }
    }

    if (kind === "prop") {
      for (const p of linked.props) {
        addPresent(p.id, p.name);
      }
      for (const scene of params.proposal.scenes) {
        for (const item of scene.proposedProps) {
          missing.push({
            id: entryId("prop", item.tempId),
            name: item.name,
            status: "missing",
            reasonKeys: [item.reasonKey, "studio.assetEvolution.stillMissing"],
            isNewSuggestion: true,
          });
        }
      }
    }

    if (kind === "world") {
      for (const w of linked.worlds) {
        addPresent(w.id, w.name);
      }
    }

    return { kind, present, recommended, missing };
  };

  return {
    sections: KINDS.map(sectionForKind),
    continuityAdvice: [],
    visualGaps: [],
    shotAdvice: [],
  };
}

export function buildAssetEvolutionCompare(params: {
  storyboard: StudioStoryboardDetail;
  proposal: StudioDirectorProposal;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): AssetEvolutionCompare {
  return {
    current: buildStoryboardAssetEvolution(params),
    proposed: buildAssetEvolutionFromProposal({
      proposal: params.proposal,
      memory: params.memory,
    }),
  };
}

export function analyzeAssetEvolutionContinuity(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): AssetEvolutionAdvice[] {
  const advice: AssetEvolutionAdvice[] = [];
  const presentCharIds = new Set(
    params.storyboard.scenes.flatMap((s) => s.characters.map((c) => c.id))
  );
  const presentLocIds = new Set(
    params.storyboard.scenes
      .map((s) => s.locationId ?? s.location?.id)
      .filter((id): id is string => Boolean(id))
  );
  const presentWorldIds = new Set<string>();
  for (const scene of params.storyboard.scenes) {
    for (const c of scene.characters) {
      if (c.worldProfile?.id) {
        presentWorldIds.add(c.worldProfile.id);
      }
    }
    if (scene.location?.worldProfile?.id) {
      presentWorldIds.add(scene.location.worldProfile.id);
    }
  }

  const recurring = findRecurringMatchesForIdea({
    idea: ideaFromStoryboard(params.storyboard),
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
    memory: params.memory,
  });

  for (const match of recurring) {
    const kind = recurringKindToEvolution(match.kind);
    if (!kind) {
      continue;
    }
    const inStory =
      kind === "character" ? presentCharIds.has(match.assetId)
      : kind === "location" ? presentLocIds.has(match.assetId)
      : kind === "world" ? presentWorldIds.has(match.assetId)
      : false;
    if (inStory || match.usage.storyboardCount < 2) {
      continue;
    }
    advice.push({
      code: `recurring_${kind}_missing`,
      kind,
      messageKey: "studio.assetEvolution.continuity.recurringMissing",
      sceneOrders: [],
    });
  }

  const gaps = missingSceneGaps(params.storyboard);
  if (gaps.characters.length > 0) {
    advice.push({
      code: "missing_characters",
      kind: "character",
      messageKey: "studio.assetEvolution.continuity.missingCharacters",
      sceneOrders: gaps.characters,
    });
  }
  if (gaps.locations.length > 0) {
    advice.push({
      code: "missing_locations",
      kind: "location",
      messageKey: "studio.assetEvolution.continuity.missingLocations",
      sceneOrders: gaps.locations,
    });
  }

  return advice;
}

export function buildVisualProductionAssetGaps(
  storyboard: StudioStoryboardDetail
): AssetEvolutionAdvice[] {
  const advice: AssetEvolutionAdvice[] = [];
  for (const scene of storyboard.scenes) {
    if (sceneHasCompletedImage(scene)) {
      continue;
    }
    if (scene.characters.length === 0) {
      advice.push({
        code: "image_missing_character",
        kind: "character",
        messageKey: "studio.assetEvolution.visual.missingBecauseCharacter",
        sceneOrders: [scene.order],
      });
    } else if (!scene.locationId && !scene.location) {
      advice.push({
        code: "image_missing_location",
        kind: "location",
        messageKey: "studio.assetEvolution.visual.missingBecauseLocation",
        sceneOrders: [scene.order],
      });
    }
  }
  return advice;
}

const SHOT_NEEDS_CHARACTER =
  /\b(chef|person|character|host|presentator|mascot|koken|bereidt|cook|prepares)\b/i;

export function buildShotPlannerAssetAdvice(
  storyboard: StudioStoryboardDetail
): AssetEvolutionAdvice[] {
  const advice: AssetEvolutionAdvice[] = [];
  const plan = buildCurrentStoryboardShotPlan(storyboard);

  for (const scenePlan of plan.scenes) {
    const scene = storyboard.scenes.find((s) => s.id === scenePlan.sceneId);
    if (!scene) {
      continue;
    }
    const focusText = `${scene.action} ${scene.title} ${scene.description}`;
    const needsCharacter =
      SHOT_NEEDS_CHARACTER.test(focusText) ||
      scenePlan.shotType === "medium_close_up" ||
      scenePlan.shotType === "close_up";
    if (needsCharacter && scene.characters.length === 0) {
      advice.push({
        code: "shot_needs_character",
        kind: "character",
        messageKey: "studio.assetEvolution.shot.missingCharacter",
        sceneOrders: [scene.order],
      });
    }
    if (
      (scenePlan.shotType === "wide" || scenePlan.shotType === "extreme_wide") &&
      !scene.locationId &&
      !scene.location
    ) {
      advice.push({
        code: "shot_needs_location",
        kind: "location",
        messageKey: "studio.assetEvolution.shot.missingLocation",
        sceneOrders: [scene.order],
      });
    }
  }

  return advice;
}

export function evolutionKindTitleKey(kind: AssetEvolutionKind): string {
  return `studio.assetEvolution.section.${kind}`;
}

export function evolutionStatusIcon(status: AssetEvolutionStatus): string {
  if (status === "present") {
    return "✓";
  }
  if (status === "recommended") {
    return "⚠";
  }
  return "✚";
}

export function mergeUsageFromMemory(
  entry: AssetEvolutionEntry,
  memory: StudioProjectMemorySnapshot | undefined,
  kind: AssetEvolutionKind
): AssetEvolutionEntry {
  if (!memory || !entry.existingId) {
    return entry;
  }
  const usage = getAssetUsageStats(memory, kindToMemoryKey(kind), entry.existingId);
  return {
    ...entry,
    usageStoryboardCount: usage.storyboardCount,
    usageRenderCount: usage.renderCount,
  };
}
