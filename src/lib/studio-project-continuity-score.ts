/**
 * Project continuity score — reuses existing consistency overview data.
 */

import {
  buildStudioConsistencyOverview,
  levelFromScore,
  type ConsistencyLevel,
  type StudioConsistencyOverview,
} from "@/lib/studio-consistency-overview";
import { getAssetUsageStats } from "@/lib/studio-project-memory-utils";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";

export type ProjectContinuityScore = {
  score: number;
  level: ConsistencyLevel;
  alignmentScore: number;
  consistencyScore: number;
  reusedAssetCount: number;
  linkedAssetCount: number;
  recommendationKeys: string[];
};

export function buildProjectContinuityScore(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory: StudioProjectMemorySnapshot;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  overview?: StudioConsistencyOverview;
}): ProjectContinuityScore {
  const overview =
    params.overview ??
    buildStudioConsistencyOverview({
      storyboard: params.storyboard,
      characters: params.characters,
      styleProfile: params.styleProfile,
      directorProfile: params.directorProfile,
    });

  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const usedCharacterIds = new Set<string>();
  const usedLocationIds = new Set<string>();
  const usedPropIds = new Set<string>();
  const usedWorldIds = new Set<string>();

  for (const scene of scenes) {
    for (const character of scene.characters) {
      usedCharacterIds.add(character.id);
      if (character.worldProfile?.id) {
        usedWorldIds.add(character.worldProfile.id);
      }
    }
    if (scene.locationId) {
      usedLocationIds.add(scene.locationId);
    }
    if (scene.location?.worldProfile?.id) {
      usedWorldIds.add(scene.location.worldProfile.id);
    }
    for (const prop of scene.props ?? []) {
      usedPropIds.add(prop.id);
    }
  }

  let reused = 0;
  let linked = 0;
  const recommendationKeys: string[] = [];

  for (const id of usedCharacterIds) {
    linked++;
    const usage = getAssetUsageStats(params.memory, "characters", id);
    if (usage.storyboardCount >= 2) {
      reused++;
    }
  }
  for (const id of usedLocationIds) {
    linked++;
    const usage = getAssetUsageStats(params.memory, "locations", id);
    if (usage.storyboardCount >= 2) {
      reused++;
    }
  }
  for (const id of usedPropIds) {
    linked++;
    const usage = getAssetUsageStats(params.memory, "props", id);
    if (usage.storyboardCount >= 2) {
      reused++;
    }
  }
  for (const id of usedWorldIds) {
    linked++;
    const usage = getAssetUsageStats(params.memory, "worlds", id);
    if (usage.storyboardCount >= 1) {
      reused++;
    }
  }

  const alignmentScore =
    linked === 0 ? 50 : Math.round((reused / linked) * 100);
  const consistencyScore = overview.overallScore;
  const score = Math.round((consistencyScore * 0.6 + alignmentScore * 0.4));

  if (reused === 0 && params.characters.length > 0) {
    recommendationKeys.push("studio.continuity.rec.reuseCharacters");
  }
  if (usedLocationIds.size === 0 && params.locations.length > 0) {
    recommendationKeys.push("studio.continuity.rec.reuseLocations");
  }
  if (usedWorldIds.size === 0 && params.worlds.length > 0) {
    recommendationKeys.push("studio.continuity.rec.reuseWorld");
  }
  if (score >= 85) {
    recommendationKeys.push("studio.continuity.rec.universeAligned");
  }

  return {
    score,
    level: levelFromScore(score),
    alignmentScore,
    consistencyScore,
    reusedAssetCount: reused,
    linkedAssetCount: linked,
    recommendationKeys: recommendationKeys.slice(0, 4),
  };
}

export type ContinuityLibrarySection = {
  id: "characters" | "locations" | "worlds" | "voices" | "styles";
  items: ContinuityLibraryItem[];
};

export type ContinuityLibraryItem = {
  id: string;
  name: string;
  subtitleKey?: string;
  subtitleParams?: Record<string, string>;
  storyboardCount: number;
  renderCount: number;
  campaignCount: number;
  inCurrentProject: boolean;
  tool: "characters" | "locations" | "world" | "voice" | "story";
};

export function buildContinuityLibrarySections(params: {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  worlds: StudioWorldProfileListItem[];
  memory: StudioProjectMemorySnapshot;
}): ContinuityLibrarySection[] {
  const scenes = params.storyboard.scenes;
  const usedCharacterIds = new Set(scenes.flatMap((s) => s.characters.map((c) => c.id)));
  const usedLocationIds = new Set(
    scenes.map((s) => s.locationId).filter((id): id is string => Boolean(id))
  );
  const usedWorldIds = new Set<string>();
  for (const scene of scenes) {
    for (const c of scene.characters) {
      if (c.worldProfile?.id) {
        usedWorldIds.add(c.worldProfile.id);
      }
    }
    if (scene.location?.worldProfile?.id) {
      usedWorldIds.add(scene.location.worldProfile.id);
    }
  }

  const characterItems: ContinuityLibraryItem[] = params.characters
    .map((character) => {
      const usage = getAssetUsageStats(params.memory, "characters", character.id);
      return {
        id: character.id,
        name: character.name,
        subtitleKey:
          usage.storyboardCount >= 2 ? "studio.continuity.usage.series"
          : usage.storyboardCount === 1 ? "studio.continuity.usage.once"
          : undefined,
        subtitleParams: {
          storyboards: String(usage.storyboardCount),
          renders: String(usage.renderCount),
          campaigns: String(usage.campaignCount),
        },
        storyboardCount: usage.storyboardCount,
        renderCount: usage.renderCount,
        campaignCount: usage.campaignCount,
        inCurrentProject: usedCharacterIds.has(character.id),
        tool: "characters" as const,
      };
    })
    .sort((a, b) => b.storyboardCount - a.storyboardCount || a.name.localeCompare(b.name));

  const locationItems: ContinuityLibraryItem[] = params.locations
    .map((location) => {
      const usage = getAssetUsageStats(params.memory, "locations", location.id);
      return {
        id: location.id,
        name: location.name,
        subtitleKey:
          usage.storyboardCount >= 2 ? "studio.continuity.usage.series"
          : usage.storyboardCount === 1 ? "studio.continuity.usage.once"
          : undefined,
        subtitleParams: {
          storyboards: String(usage.storyboardCount),
          renders: String(usage.renderCount),
          campaigns: String(usage.campaignCount),
        },
        storyboardCount: usage.storyboardCount,
        renderCount: usage.renderCount,
        campaignCount: usage.campaignCount,
        inCurrentProject: usedLocationIds.has(location.id),
        tool: "locations" as const,
      };
    })
    .sort((a, b) => b.storyboardCount - a.storyboardCount || a.name.localeCompare(b.name));

  const worldItems: ContinuityLibraryItem[] = params.worlds
    .map((world) => {
      const usage = getAssetUsageStats(params.memory, "worlds", world.id);
      return {
        id: world.id,
        name: world.name,
        subtitleKey:
          usage.storyboardCount >= 2 ? "studio.continuity.usage.series"
          : usage.storyboardCount >= 1 ? "studio.continuity.usage.once"
          : undefined,
        subtitleParams: {
          storyboards: String(usage.storyboardCount),
          renders: String(usage.renderCount),
          campaigns: String(usage.campaignCount),
        },
        storyboardCount: usage.storyboardCount,
        renderCount: usage.renderCount,
        campaignCount: usage.campaignCount,
        inCurrentProject: usedWorldIds.has(world.id),
        tool: "world" as const,
      };
    })
    .sort((a, b) => b.storyboardCount - a.storyboardCount || a.name.localeCompare(b.name));

  const voiceItems: ContinuityLibraryItem[] = params.memory.voices.map((voice) => ({
    id: voice.profileId,
    name: voice.labelKey,
    subtitleKey: "studio.continuity.usage.voice",
    subtitleParams: {
      storyboards: String(voice.storyboardCount),
      characters: String(voice.characterCount),
      renders: "0",
      campaigns: "0",
    },
    storyboardCount: voice.storyboardCount,
    renderCount: 0,
    campaignCount: 0,
    inCurrentProject: params.storyboard.voiceProfile === voice.profileId,
    tool: "voice" as const,
  }));

  const styleItems: ContinuityLibraryItem[] = params.memory.styles.map((style, index) => ({
    id: `${style.promptStyleProfile}-${style.directorProfile}-${index}`,
    name: `${style.promptStyleProfile} · ${style.directorProfile}`,
    subtitleKey: "studio.continuity.usage.style",
    subtitleParams: {
      storyboards: String(style.storyboardCount),
      renders: "0",
      campaigns: "0",
    },
    storyboardCount: style.storyboardCount,
    renderCount: 0,
    campaignCount: 0,
    inCurrentProject:
      params.storyboard.promptStyleProfile === style.promptStyleProfile &&
      params.storyboard.directorProfile === style.directorProfile,
    tool: "story" as const,
  }));

  return [
    { id: "characters", items: characterItems },
    { id: "locations", items: locationItems },
    { id: "worlds", items: worldItems },
    { id: "voices", items: voiceItems },
    { id: "styles", items: styleItems },
  ];
}
