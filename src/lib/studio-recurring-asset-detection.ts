/**
 * Recurring asset detection — library reuse before proposing duplicates.
 */

import { tokenizeForAssetMatch } from "@/lib/studio-director-proposal-builder";
import { toIdentitySpec, toSearchHaystack } from "@/lib/studio-identity-spec-engine";
import { getAssetUsageStats } from "@/lib/studio-project-memory-utils";
import type {
  StudioAssetUsageStats,
  StudioProjectMemorySnapshot,
} from "@/types/studio-project-memory";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

export type RecurringAssetKind = "character" | "location" | "prop" | "world";

export type RecurringAssetMatch = {
  kind: RecurringAssetKind;
  assetId: string;
  assetName: string;
  matchReasonKeys: string[];
  usage: StudioAssetUsageStats;
  voiceProfile?: string;
  worldProfileId?: string;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function usageBoost(stats: StudioAssetUsageStats): number {
  return Math.min(stats.storyboardCount * 4 + stats.renderCount * 2, 20);
}

function scoreTokensAgainstHaystackText(tokens: string[], haystackText: string): number {
  let score = 0;
  for (const token of tokens) {
    if (haystackText.includes(token)) {
      score += token.length >= 5 ? 3 : 2;
    }
  }
  return score;
}

function scoreIdeaTokensAgainstCharacter(tokens: string[], character: StudioCharacterListItem): number {
  const haystackText = toSearchHaystack(toIdentitySpec(character)).fullText.toLowerCase();
  return scoreTokensAgainstHaystackText(tokens, haystackText);
}

function scoreIdeaTokensAgainstLocation(tokens: string[], location: StudioLocationListItem): number {
  const haystackText = toSearchHaystack(toIdentitySpec(location)).fullText.toLowerCase();
  return scoreTokensAgainstHaystackText(tokens, haystackText);
}

function scoreIdeaTokensAgainstWorld(tokens: string[], world: StudioWorldProfileListItem): number {
  const haystackText = toSearchHaystack(toIdentitySpec(world)).fullText.toLowerCase();
  return scoreTokensAgainstHaystackText(tokens, haystackText);
}

export function detectRecurringCharacter(params: {
  idea: string;
  characters: StudioCharacterListItem[];
  memory?: StudioProjectMemorySnapshot;
  candidateName?: string;
}): RecurringAssetMatch | null {
  const tokens = tokenizeForAssetMatch(params.idea);
  let best: RecurringAssetMatch | null = null;
  let bestScore = 0;

  for (const character of params.characters) {
    const reasons: string[] = [];
    const tokenScore = scoreIdeaTokensAgainstCharacter(tokens, character);
    let score = tokenScore;

    if (params.candidateName && namesMatch(character.name, params.candidateName)) {
      reasons.push("studio.continuity.match.sameName");
      score += 10;
    }

    if (character.voiceProfile?.trim() && character.voiceEnabled) {
      reasons.push("studio.continuity.match.sameVoice");
      score += 2;
    }

    if (character.worldProfile?.id) {
      reasons.push("studio.continuity.match.sameWorld");
      score += 2;
    }

    if (params.memory) {
      const usage = getAssetUsageStats(params.memory, "characters", character.id);
      if (usage.storyboardCount >= 2) {
        reasons.push("studio.continuity.match.previouslyUsed");
        score += usageBoost(usage);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = {
        kind: "character",
        assetId: character.id,
        assetName: character.name,
        matchReasonKeys: [...new Set(reasons)],
        usage: params.memory ?
          getAssetUsageStats(params.memory, "characters", character.id)
        : { storyboardCount: 0, sceneCount: 0, renderCount: 0, campaignCount: 0 },
        voiceProfile: character.voiceProfile?.trim() || undefined,
        worldProfileId: character.worldProfile?.id,
      };
    }
  }

  return bestScore >= 4 ? best : null;
}

export function detectRecurringLocation(params: {
  idea: string;
  locations: StudioLocationListItem[];
  memory?: StudioProjectMemorySnapshot;
  candidateName?: string;
}): RecurringAssetMatch | null {
  const tokens = tokenizeForAssetMatch(params.idea);
  let best: RecurringAssetMatch | null = null;
  let bestScore = 0;

  for (const location of params.locations) {
    const reasons: string[] = [];
    const tokenScore = scoreIdeaTokensAgainstLocation(tokens, location);
    let score = tokenScore;

    if (params.candidateName && namesMatch(location.name, params.candidateName)) {
      reasons.push("studio.continuity.match.sameName");
      score += 10;
    }

    if (location.worldProfile?.id) {
      reasons.push("studio.continuity.match.sameWorld");
      score += 2;
    }

    if (params.memory) {
      const usage = getAssetUsageStats(params.memory, "locations", location.id);
      if (usage.storyboardCount >= 2) {
        reasons.push("studio.continuity.match.previouslyUsed");
        score += usageBoost(usage);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = {
        kind: "location",
        assetId: location.id,
        assetName: location.name,
        matchReasonKeys: [...new Set(reasons)],
        usage: params.memory ?
          getAssetUsageStats(params.memory, "locations", location.id)
        : { storyboardCount: 0, sceneCount: 0, renderCount: 0, campaignCount: 0 },
        worldProfileId: location.worldProfile?.id,
      };
    }
  }

  return bestScore >= 4 ? best : null;
}

export function detectRecurringWorld(params: {
  idea: string;
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): RecurringAssetMatch | null {
  const tokens = tokenizeForAssetMatch(params.idea);
  let best: RecurringAssetMatch | null = null;
  let bestScore = 0;

  for (const world of params.worlds) {
    const reasons: string[] = [];
    const tokenScore = scoreIdeaTokensAgainstWorld(tokens, world);
    let score = tokenScore;

    if (params.memory) {
      const usage = getAssetUsageStats(params.memory, "worlds", world.id);
      if (usage.storyboardCount >= 1) {
        reasons.push("studio.continuity.match.previouslyUsed");
        score += usageBoost(usage);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = {
        kind: "world",
        assetId: world.id,
        assetName: world.name,
        matchReasonKeys: [...new Set(reasons)],
        usage: params.memory ?
          getAssetUsageStats(params.memory, "worlds", world.id)
        : { storyboardCount: 0, sceneCount: 0, renderCount: 0, campaignCount: 0 },
      };
    }
  }

  return bestScore >= 4 ? best : null;
}

export function memoryUsageLabelParams(usage: StudioAssetUsageStats): Record<string, string> {
  return {
    storyboards: String(usage.storyboardCount),
    renders: String(usage.renderCount),
    campaigns: String(usage.campaignCount),
  };
}

export function findRecurringMatchesForIdea(params: {
  idea: string;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): RecurringAssetMatch[] {
  const matches: RecurringAssetMatch[] = [];
  const character = detectRecurringCharacter({
    idea: params.idea,
    characters: params.characters,
    memory: params.memory,
  });
  const location = detectRecurringLocation({
    idea: params.idea,
    locations: params.locations,
    memory: params.memory,
  });
  const world = detectRecurringWorld({
    idea: params.idea,
    worlds: params.worlds,
    memory: params.memory,
  });
  if (character) {
    matches.push(character);
  }
  if (location) {
    matches.push(location);
  }
  if (world) {
    matches.push(world);
  }
  return matches;
}
