/**
 * Readiness fix actions — library-backed suggestions, no auto-save.
 */

import {
  scoreAssetMatch,
  tokenizeForAssetMatch,
} from "@/lib/studio-director-proposal-builder";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import {
  getVoiceProfilePreset,
  normalizeStudioNarrationMode,
  profileIdForNarrationMode,
} from "@/lib/studio-voice-profiles";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import type { UnifiedReadinessCheck, UnifiedReadinessCheckId } from "@/lib/studio-unified-readiness";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

const MIN_MATCH = 2;

export type StudioReadinessFixAction = {
  id: string;
  checkId: UnifiedReadinessCheckId;
  issueKey: string;
  suggestionKey?: string;
  reasonKey?: string;
  currentLabel: string;
  suggestedLabel: string;
  suggestedAssetId?: string;
  suggestedVoiceProfile?: string;
  tool: StudioToolId;
  sceneOrder?: number;
};

function pickBest<T extends { id: string; name: string }>(
  items: T[],
  scorer: (item: T) => number
): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const item of items) {
    const score = scorer(item);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= MIN_MATCH ? best : items[0] ?? null;
}

function promptTokens(storyboard: StudioStoryboardDetail): string[] {
  return tokenizeForAssetMatch(
    `${storyboard.title} ${storyboard.description} ${storyboard.aiDirectorPrompt}`
  );
}

export function buildReadinessFixActions(params: {
  storyboard: StudioStoryboardDetail;
  checks: UnifiedReadinessCheck[];
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
}): StudioReadinessFixAction[] {
  const fixes: StudioReadinessFixAction[] = [];
  const tokens = promptTokens(params.storyboard);
  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const noneLabel = "—";

  for (const check of params.checks.filter((c) => !c.passed)) {
    if (check.id === "characters") {
      const sceneWithout = scenes.find((s) => s.characters.length === 0);
      const suggested = pickBest(params.characters, (c) =>
        scoreAssetMatch(c.name, c.description, c.role, tokens, [c.visualKeywords ?? ""])
      );
      if (suggested) {
        fixes.push({
          id: `fix-characters-${suggested.id}`,
          checkId: "characters",
          issueKey: "studio.execution.fix.characters.missing",
          suggestionKey: "studio.execution.fix.suggestedAsset",
          reasonKey: "studio.execution.fix.reason.libraryMatch",
          currentLabel: noneLabel,
          suggestedLabel: suggested.name,
          suggestedAssetId: suggested.id,
          tool: "characters",
          sceneOrder: sceneWithout ? sceneWithout.order + 1 : undefined,
        });
      } else {
        fixes.push({
          id: "fix-characters-open",
          checkId: "characters",
          issueKey: "studio.execution.fix.characters.missing",
          currentLabel: noneLabel,
          suggestedLabel: noneLabel,
          tool: "characters",
        });
      }
    }

    if (check.id === "location") {
      const sceneWithout = scenes.find((s) => !s.locationId && !s.location);
      const suggested = pickBest(params.locations, (l) =>
        scoreAssetMatch(l.name, l.description, l.category, tokens, [l.visualIdentity ?? ""])
      );
      if (suggested) {
        fixes.push({
          id: `fix-location-${suggested.id}`,
          checkId: "location",
          issueKey: "studio.execution.fix.location.missing",
          suggestionKey: "studio.execution.fix.suggestedAsset",
          reasonKey: "studio.execution.fix.reason.libraryMatch",
          currentLabel: noneLabel,
          suggestedLabel: suggested.name,
          suggestedAssetId: suggested.id,
          tool: "locations",
          sceneOrder: sceneWithout ? sceneWithout.order + 1 : undefined,
        });
      } else {
        fixes.push({
          id: "fix-location-open",
          checkId: "location",
          issueKey: "studio.execution.fix.location.missing",
          currentLabel: noneLabel,
          suggestedLabel: noneLabel,
          tool: "locations",
        });
      }
    }

    if (check.id === "world") {
      const suggested = params.worlds[0] ?? null;
      fixes.push({
        id: suggested ? `fix-world-${suggested.id}` : "fix-world-open",
        checkId: "world",
        issueKey: "studio.execution.fix.world.missing",
        suggestionKey: suggested ? "studio.execution.fix.suggestedAsset" : undefined,
        currentLabel: noneLabel,
        suggestedLabel: suggested?.name ?? noneLabel,
        suggestedAssetId: suggested?.id,
        tool: "world",
      });
    }

    if (check.id === "images") {
      const missing = scenes.filter((s) => !sceneHasCompletedImage(s)).length;
      fixes.push({
        id: "fix-images-generate",
        checkId: "images",
        issueKey: "studio.execution.fix.images.missing",
        suggestionKey: "studio.execution.fix.openVisual",
        currentLabel: String(scenes.length - missing),
        suggestedLabel: String(scenes.length),
        tool: "visual",
      });
    }

    if (check.id === "voice" && params.storyboard.voiceEnabled) {
      const narrationMode = normalizeStudioNarrationMode(
        params.storyboard.narrationMode || "narrator"
      );
      const voiceReport = analyzeVoiceDirector(params.storyboard);
      const profileId =
        params.storyboard.voiceProfile?.trim() ||
        voiceReport.voiceProfile ||
        profileIdForNarrationMode(narrationMode);
      const preset = getVoiceProfilePreset(profileId);
      fixes.push({
        id: `fix-voice-${profileId}`,
        checkId: "voice",
        issueKey: "studio.execution.fix.voice.missing",
        suggestionKey: "studio.execution.fix.suggestedVoice",
        reasonKey: "studio.execution.fix.reason.voiceMatch",
        currentLabel: noneLabel,
        suggestedLabel: preset.labelKey,
        suggestedVoiceProfile: profileId,
        tool: "voice",
      });
    }

    if (check.id === "camera") {
      fixes.push({
        id: "fix-camera-story",
        checkId: "camera",
        issueKey: "studio.execution.fix.camera.missing",
        suggestionKey: "studio.execution.fix.openStory",
        currentLabel: noneLabel,
        suggestedLabel: noneLabel,
        tool: "story",
      });
    }

    if (check.id === "scenes") {
      fixes.push({
        id: "fix-scenes-story",
        checkId: "scenes",
        issueKey: "studio.execution.fix.scenes.tooFew",
        tool: "story",
        currentLabel: String(scenes.length),
        suggestedLabel: "2+",
      });
    }

    if (check.id === "text_beats") {
      fixes.push({
        id: "fix-text-beats",
        checkId: "text_beats",
        issueKey: "studio.execution.fix.textBeats.missing",
        tool: "text",
        currentLabel: noneLabel,
        suggestedLabel: noneLabel,
      });
    }

    if (check.id === "emotion") {
      fixes.push({
        id: "fix-emotion-story",
        checkId: "emotion",
        issueKey: "studio.execution.fix.emotion.missing",
        tool: "story",
        currentLabel: noneLabel,
        suggestedLabel: noneLabel,
      });
    }
  }

  const seen = new Set<string>();
  return fixes.filter((f) => {
    if (seen.has(f.id)) {
      return false;
    }
    seen.add(f.id);
    return true;
  });
}
