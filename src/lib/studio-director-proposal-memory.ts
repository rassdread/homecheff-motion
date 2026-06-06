/**
 * AI Director project memory — prefer existing universe before new assets.
 */

import {
  detectRecurringCharacter,
  detectRecurringLocation,
  findRecurringMatchesForIdea,
  memoryUsageLabelParams,
  type RecurringAssetMatch,
} from "@/lib/studio-recurring-asset-detection";
import { getAssetUsageStats } from "@/lib/studio-project-memory-utils";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  DirectorProposalMemorySuggestion,
  ProposedAssetRef,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

function toAssetRef(id: string, name: string): ProposedAssetRef {
  return { existingId: id, name };
}

export function buildDirectorMemorySuggestions(params: {
  idea: string;
  proposal: StudioDirectorProposal;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot;
}): DirectorProposalMemorySuggestion[] {
  if (!params.memory) {
    return [];
  }

  const suggestions: DirectorProposalMemorySuggestion[] = [];
  const recurring = findRecurringMatchesForIdea({
    idea: params.idea,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
    memory: params.memory,
  });

  for (const match of recurring) {
    suggestions.push(recurringToSuggestion(match));
  }

  if (params.proposal.audio.musicEnabled) {
    const music = params.memory.libraryAudio.find(
      (a) => a.kind === "music" && a.storyboardCount > 0
    );
    if (music) {
      suggestions.push({
        id: `memory-audio-music-${music.id}`,
        kind: "audio",
        issueKey: "studio.audioMix.directorReuseMusic",
        memoryBasisKeys: ["studio.continuity.memory.basedOnAudio"],
        memoryBasisParams: [{ name: music.name }],
        assetRef: toAssetRef(music.id, music.name),
        usageStoryboardCount: music.storyboardCount,
        usageRenderCount: music.renderCount,
      });
    }
  }

  if (params.proposal.audio.soundEnabled) {
    const sound = params.memory.libraryAudio.find(
      (a) => a.kind === "sfx" && a.storyboardCount > 0
    );
    if (sound) {
      suggestions.push({
        id: `memory-audio-sfx-${sound.id}`,
        kind: "audio",
        issueKey: "studio.audioMix.directorReuseSound",
        memoryBasisKeys: ["studio.continuity.memory.basedOnAudio"],
        memoryBasisParams: [{ name: sound.name }],
        assetRef: toAssetRef(sound.id, sound.name),
        usageStoryboardCount: sound.storyboardCount,
        usageRenderCount: sound.renderCount,
      });
    }
  }

  for (const scene of params.proposal.scenes) {
    for (const proposed of scene.proposedCharacters) {
      const recurringChar = detectRecurringCharacter({
        idea: params.idea,
        characters: params.characters,
        memory: params.memory,
        candidateName: proposed.name,
      });
      if (recurringChar && !scene.characterRefs.some((c) => c.existingId === recurringChar.assetId)) {
        suggestions.push({
          id: `memory-char-${scene.tempId}-${recurringChar.assetId}`,
          kind: "character",
          issueKey: "studio.continuity.knownCharacter",
          memoryBasisKeys: [
            "studio.continuity.memory.basedOnCharacter",
            ...recurringChar.matchReasonKeys,
          ],
          memoryBasisParams: [
            { name: recurringChar.assetName },
            memoryUsageLabelParams(recurringChar.usage),
          ],
          assetRef: toAssetRef(recurringChar.assetId, recurringChar.assetName),
          proposedName: proposed.name,
          usageStoryboardCount: recurringChar.usage.storyboardCount,
          usageRenderCount: recurringChar.usage.renderCount,
          sceneOrder: scene.order + 1,
        });
      }
    }

    if (scene.proposedLocation) {
      const recurringLoc = detectRecurringLocation({
        idea: params.idea,
        locations: params.locations,
        memory: params.memory,
        candidateName: scene.proposedLocation.name,
      });
      if (recurringLoc && scene.locationRef?.existingId !== recurringLoc.assetId) {
        suggestions.push({
          id: `memory-loc-${scene.tempId}-${recurringLoc.assetId}`,
          kind: "location",
          issueKey: "studio.continuity.knownLocation",
          memoryBasisKeys: [
            "studio.continuity.memory.basedOnLocation",
            ...recurringLoc.matchReasonKeys,
          ],
          memoryBasisParams: [
            { name: recurringLoc.assetName },
            memoryUsageLabelParams(recurringLoc.usage),
          ],
          assetRef: toAssetRef(recurringLoc.assetId, recurringLoc.assetName),
          proposedName: scene.proposedLocation.name,
          usageStoryboardCount: recurringLoc.usage.storyboardCount,
          usageRenderCount: recurringLoc.usage.renderCount,
          sceneOrder: scene.order + 1,
        });
      }
    }
  }

  const seen = new Set<string>();
  return suggestions.filter((s) => {
    if (seen.has(s.id)) {
      return false;
    }
    seen.add(s.id);
    return true;
  });
}

function recurringToSuggestion(match: RecurringAssetMatch): DirectorProposalMemorySuggestion {
  const issueKey =
    match.kind === "character" ? "studio.continuity.knownCharacter"
    : match.kind === "location" ? "studio.continuity.knownLocation"
    : "studio.continuity.partOfUniverse";

  const basisKey =
    match.kind === "character" ? "studio.continuity.memory.basedOnCharacter"
    : match.kind === "location" ? "studio.continuity.memory.basedOnLocation"
    : "studio.continuity.memory.basedOnWorld";

  return {
    id: `memory-${match.kind}-${match.assetId}`,
    kind: match.kind,
    issueKey,
    memoryBasisKeys: [basisKey, ...match.matchReasonKeys],
    memoryBasisParams: [{ name: match.assetName }, memoryUsageLabelParams(match.usage)],
    assetRef: toAssetRef(match.assetId, match.assetName),
    usageStoryboardCount: match.usage.storyboardCount,
    usageRenderCount: match.usage.renderCount,
  };
}

/** Apply memory suggestion onto proposal scenes (in-memory only). */
export function applyDirectorMemorySuggestion(
  proposal: StudioDirectorProposal,
  suggestionId: string
): StudioDirectorProposal {
  const suggestion = proposal.memorySuggestions?.find((s) => s.id === suggestionId);
  if (!suggestion?.assetRef) {
    return proposal;
  }
  const assetRef = suggestion.assetRef;

  const scenes: ProposedScene[] = proposal.scenes.map((scene) => {
    if (suggestion.sceneOrder != null && scene.order + 1 !== suggestion.sceneOrder) {
      return scene;
    }

    if (suggestion.kind === "character") {
      const hasRef = scene.characterRefs.some((c) => c.existingId === assetRef.existingId);
      if (hasRef) {
        return scene;
      }
      return {
        ...scene,
        characterRefs: [...scene.characterRefs, assetRef],
        proposedCharacters: scene.proposedCharacters.filter(
          (p) => !suggestion.proposedName || p.name !== suggestion.proposedName
        ),
      };
    }

    if (suggestion.kind === "location" && !scene.locationRef) {
      return {
        ...scene,
        locationRef: assetRef,
        proposedLocation: null,
      };
    }

    return scene;
  });

  return { ...proposal, scenes };
}

export function memoryBoostForAsset(
  memory: StudioProjectMemorySnapshot | undefined,
  kind: "characters" | "locations" | "props" | "worlds",
  assetId: string
): number {
  if (!memory) {
    return 0;
  }
  const usage = getAssetUsageStats(memory, kind, assetId);
  return Math.min(usage.storyboardCount * 3 + usage.renderCount * 2, 15);
}
