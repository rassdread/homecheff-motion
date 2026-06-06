/**
 * Enrich AI Director proposals with consistency gaps and library suggestions.
 */

import { buildStoryHealthAdvisorReport } from "@/lib/studio-story-health-advisor";
import {
  buildProposalAppliedStoryboard,
} from "@/lib/studio-director-proposal-readiness";
import type { ProposalTextResolver } from "@/lib/studio-director-proposal-apply";
import {
  scoreAssetMatch,
  tokenizeForAssetMatch,
} from "@/lib/studio-director-proposal-builder";
import { buildStudioUnifiedReadiness } from "@/lib/studio-unified-readiness";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type {
  DirectorProposalConsistencySuggestion,
  DirectorProposalFieldChange,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

function labelOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function buildFieldChanges(params: {
  storyboard: StudioStoryboardDetail;
  proposal: StudioDirectorProposal;
  t: ProposalTextResolver;
}): DirectorProposalFieldChange[] {
  const changes: DirectorProposalFieldChange[] = [];
  const existingById = new Map(params.storyboard.scenes.map((s) => [s.id, s]));

  for (const scene of params.proposal.scenes) {
    const existing = scene.existingSceneId ? existingById.get(scene.existingSceneId) : null;
    const order = scene.order + 1;

    const fromLocation = labelOrDash(existing?.location?.name);
    const toLocation = labelOrDash(scene.locationRef?.name ?? scene.proposedLocation?.name);
    if (fromLocation !== toLocation) {
      changes.push({
        id: `loc-${scene.tempId}`,
        sceneOrder: order,
        fieldKey: "studio.execution.change.location",
        fromLabel: fromLocation,
        toLabel: toLocation,
      });
    }

    const fromVoice = labelOrDash(
      existing?.characters[0]?.name ?? (params.storyboard.voiceEnabled ? params.storyboard.voiceProfile : "")
    );
    const toVoice = labelOrDash(
      scene.characterRefs[0]?.name ??
        params.proposal.voices.characterVoices[0]?.characterName ??
        params.proposal.audio.voiceProfile
    );
    if (fromVoice !== toVoice && scene.characterRefs.length > 0) {
      changes.push({
        id: `char-${scene.tempId}`,
        sceneOrder: order,
        fieldKey: "studio.execution.change.characters",
        fromLabel: fromLocation === "—" ? "—" : fromVoice,
        toLabel: toVoice,
      });
    }

    const fromCamera = labelOrDash(existing?.shotType || existing?.camera);
    const toCamera = labelOrDash(scene.shotType || scene.camera);
    if (fromCamera !== toCamera) {
      changes.push({
        id: `cam-${scene.tempId}`,
        sceneOrder: order,
        fieldKey: "studio.execution.change.camera",
        fromLabel: fromCamera,
        toLabel: toCamera,
      });
    }

    const fromEmotion = labelOrDash(existing?.emotion);
    const toEmotion = labelOrDash(scene.emotion);
    if (fromEmotion !== toEmotion) {
      changes.push({
        id: `emo-${scene.tempId}`,
        sceneOrder: order,
        fieldKey: "studio.execution.change.emotion",
        fromLabel: fromEmotion,
        toLabel: toEmotion,
      });
    }
  }

  const storyVoiceFrom = labelOrDash(params.storyboard.voiceProfile);
  const storyVoiceTo = labelOrDash(params.proposal.audio.voiceProfile);
  if (storyVoiceFrom !== storyVoiceTo) {
    const preset = getVoiceProfilePreset(params.proposal.audio.voiceProfile);
    changes.push({
      id: "story-voice",
      fieldKey: "studio.execution.change.voice",
      fromLabel: storyVoiceFrom,
      toLabel: preset.labelKey,
    });
  }

  return changes.slice(0, 12);
}

function enrichScenesWithLibraryGaps(params: {
  proposal: StudioDirectorProposal;
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
}): DirectorProposalConsistencySuggestion[] {
  const suggestions: DirectorProposalConsistencySuggestion[] = [];
  const tokens = tokenizeForAssetMatch(params.proposal.ideaPrompt);
  const scenes = params.proposal.scenes;

  for (const scene of scenes) {
    if (!scene.locationRef && params.locations.length > 0) {
      let best = params.locations[0]!;
      let bestScore = 0;
      for (const loc of params.locations) {
        const score = scoreAssetMatch(loc.name, loc.description, loc.category, tokens, []);
        if (score > bestScore) {
          bestScore = score;
          best = loc;
        }
      }
      suggestions.push({
        id: `suggest-loc-${scene.tempId}`,
        domain: "location",
        issueKey: "studio.execution.fix.location.missing",
        currentLabel: "—",
        suggestedLabel: best.name,
        reasonKey: "studio.execution.fix.reason.libraryMatch",
        sceneOrder: scene.order + 1,
        assetRef: { existingId: best.id, name: best.name },
      });
    }

    if (scene.characterRefs.length === 0 && params.characters.length > 0) {
      let best = params.characters[0]!;
      let bestScore = 0;
      for (const c of params.characters) {
        const score = scoreAssetMatch(c.name, c.description, c.role, tokens, []);
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      suggestions.push({
        id: `suggest-char-${scene.tempId}`,
        domain: "characters",
        issueKey: "studio.execution.fix.characters.missing",
        currentLabel: "—",
        suggestedLabel: best.name,
        reasonKey: "studio.execution.fix.reason.libraryMatch",
        sceneOrder: scene.order + 1,
        assetRef: { existingId: best.id, name: best.name },
      });
    }
  }

  return suggestions;
}

export function enrichDirectorProposalWithConsistency(params: {
  proposal: StudioDirectorProposal;
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  t: ProposalTextResolver;
}): StudioDirectorProposal {
  const storyHealth = buildStoryHealthAdvisorReport(params.storyboard, params.characters);
  const projected = buildProposalAppliedStoryboard(
    params.storyboard,
    params.proposal,
    params.characters,
    params.t
  );
  const unified = buildStudioUnifiedReadiness({
    storyboard: projected,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds ?? [],
    styleProfile: params.proposal.interpretation.promptStyleProfile,
    directorProfile: params.proposal.interpretation.directorProfile,
  });

  const fixSuggestions: DirectorProposalConsistencySuggestion[] = unified.fixes
    .filter((f) => f.suggestedAssetId || f.suggestedVoiceProfile)
    .map((f) => ({
      id: f.id,
      domain:
        f.checkId === "characters" ? "characters"
        : f.checkId === "location" ? "location"
        : f.checkId === "world" ? "world"
        : f.checkId === "voice" ? "voice"
        : f.checkId === "images" ? "visual"
        : "story",
      issueKey: f.issueKey,
      currentLabel: f.currentLabel,
      suggestedLabel: f.suggestedLabel,
      reasonKey: f.reasonKey,
      sceneOrder: f.sceneOrder,
      assetRef:
        f.suggestedAssetId ?
          { existingId: f.suggestedAssetId, name: f.suggestedLabel }
        : undefined,
      voiceProfile: f.suggestedVoiceProfile,
    }));

  const sceneSuggestions = enrichScenesWithLibraryGaps({
    proposal: params.proposal,
    storyboard: params.storyboard,
    characters: params.characters,
    locations: params.locations,
    props: params.props,
  });

  const mergedSuggestions = [...fixSuggestions, ...sceneSuggestions].filter(
    (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
  );

  return {
    ...params.proposal,
    storyHealthKeys: storyHealth.advisories.slice(0, 5).map((a) => a.messageKey),
    consistencySuggestions: mergedSuggestions.slice(0, 8),
    fieldChanges: buildFieldChanges(params),
  };
}

/** Apply a library asset suggestion onto proposal scenes (in-memory only). */
export function applyProposalConsistencySuggestion(
  proposal: StudioDirectorProposal,
  suggestionId: string
): StudioDirectorProposal {
  const suggestion = proposal.consistencySuggestions?.find((s) => s.id === suggestionId);
  if (!suggestion) {
    return proposal;
  }

  const scenes: ProposedScene[] = proposal.scenes.map((scene) => {
    if (suggestion.sceneOrder != null && scene.order + 1 !== suggestion.sceneOrder) {
      return scene;
    }

    if (suggestion.domain === "location" && suggestion.assetRef && !scene.locationRef) {
      return {
        ...scene,
        locationRef: suggestion.assetRef,
        proposedLocation: null,
      };
    }

    if (
      suggestion.domain === "characters" &&
      suggestion.assetRef &&
      scene.characterRefs.length === 0
    ) {
      return {
        ...scene,
        characterRefs: [suggestion.assetRef],
        proposedCharacters: [],
      };
    }

    return scene;
  });

  return { ...proposal, scenes };
}
