import {
  characterHasExplicitVoiceChoice,
} from "@/lib/studio-voice-profile-ref";
import {
  buildCanonicalCharacterIdentity,
  isCharacterReferenceStale,
  parseCharacterReferencesBundle,
  resolveCanonicalCharacterReferences,
} from "@/lib/studio-character-canonical-references";
import { parseStructuredKeywordsFromVisualKeywords } from "@/lib/studio-character-visual-keywords";
import type {
  CharacterConsistencyStatus,
  CharacterHealthView,
  CharacterHealthWarning,
  CharacterStoryUsage,
} from "@/types/studio-character-canonical-references";
import type { StudioCharacterListItem } from "@/types/studio-api";

export type CharacterHealthInput = StudioCharacterListItem & {
  referenceStorageKey?: string;
  updatedAt: string;
  storyUsage?: CharacterStoryUsage | null;
};

function buildWarnings(input: CharacterHealthInput): CharacterHealthWarning[] {
  const warnings: CharacterHealthWarning[] = [];
  const { bundle } = parseCharacterReferencesBundle(input.referenceNotes);

  if (!input.voiceEnabled || !characterHasExplicitVoiceChoice(input.voiceProfile)) {
    warnings.push({
      id: "no_voice",
      labelKey: "studio.characterHealth.warning.noVoice",
    });
  }

  if (!input.worldProfileId) {
    warnings.push({
      id: "no_world",
      labelKey: "studio.characterHealth.warning.noWorld",
    });
  }

  if (!input.referenceImageUrl.trim()) {
    warnings.push({
      id: "no_reference",
      labelKey: "studio.characterHealth.warning.noReference",
    });
  }

  if (
    input.referenceImageUrl.trim() &&
    isCharacterReferenceStale({ updatedAt: input.updatedAt, bundle })
  ) {
    warnings.push({
      id: "stale_reference",
      labelKey: "studio.characterHealth.warning.staleReference",
    });
  }

  return warnings;
}

function identityFilled(input: CharacterHealthInput): boolean {
  const structured = parseStructuredKeywordsFromVisualKeywords(input.visualKeywords);
  const hasName = Boolean(input.name.trim());
  const hasDescription = Boolean(input.description.trim());
  const hasType = Boolean(structured.characterType.trim() || input.role.trim());
  return hasName && hasDescription && hasType;
}

function voiceLinked(input: CharacterHealthInput): boolean {
  return input.voiceEnabled && characterHasExplicitVoiceChoice(input.voiceProfile);
}

function worldLinked(input: CharacterHealthInput): boolean {
  return Boolean(input.worldProfileId);
}

function primaryReferencePresent(input: CharacterHealthInput): boolean {
  return Boolean(input.referenceImageUrl.trim());
}

function computeScore(checks: CharacterHealthView["checks"]): number {
  const weights = [
    checks.identityFilled ? 25 : 0,
    checks.voiceLinked ? 25 : 0,
    checks.worldLinked ? 25 : 0,
    checks.primaryReferencePresent ? 25 : 0,
  ];
  return weights.reduce((sum, value) => sum + value, 0);
}

function resolveStatus(
  checks: CharacterHealthView["checks"],
  warnings: CharacterHealthWarning[]
): CharacterConsistencyStatus {
  const coreReady =
    checks.identityFilled &&
    checks.voiceLinked &&
    checks.worldLinked &&
    checks.primaryReferencePresent;

  if (coreReady && warnings.length === 0) {
    return "ready";
  }
  if (coreReady && warnings.every((w) => w.id === "stale_reference")) {
    return "needs_attention";
  }
  if (coreReady) {
    return "needs_attention";
  }
  return "needs_attention";
}

export function buildCharacterHealthView(input: CharacterHealthInput): CharacterHealthView {
  const checks = {
    identityFilled: identityFilled(input),
    voiceLinked: voiceLinked(input),
    worldLinked: worldLinked(input),
    primaryReferencePresent: primaryReferencePresent(input),
  };
  const warnings = buildWarnings(input);
  const references = resolveCanonicalCharacterReferences({
    id: input.id,
    referenceImageUrl: input.referenceImageUrl,
    referenceStorageKey: input.referenceStorageKey ?? "",
    primaryReferenceImageId: input.primaryReferenceImageId,
    referenceNotes: input.referenceNotes,
    visualKeywords: input.visualKeywords,
    defaultClothing: input.defaultClothing,
    name: input.name,
    role: input.role,
    description: input.description,
    personality: input.personality,
    appearanceMemory: input.appearanceMemory,
    worldProfileId: input.worldProfileId,
    worldProfile: input.worldProfile,
  });

  return {
    status: resolveStatus(checks, warnings),
    score: computeScore(checks),
    warnings,
    checks,
    references,
    storyUsage: input.storyUsage ?? null,
  };
}

export function buildCharacterHealthViewFromDetail(
  character: CharacterHealthInput
): CharacterHealthView {
  return buildCharacterHealthView(character);
}

export function buildCanonicalIdentityFromListItem(
  character: StudioCharacterListItem & { referenceStorageKey?: string }
) {
  return buildCanonicalCharacterIdentity({
    id: character.id,
    referenceImageUrl: character.referenceImageUrl,
    referenceStorageKey: character.referenceStorageKey ?? "",
    primaryReferenceImageId: character.primaryReferenceImageId,
    referenceNotes: character.referenceNotes,
    visualKeywords: character.visualKeywords,
    defaultClothing: character.defaultClothing,
    name: character.name,
    role: character.role,
    description: character.description,
    personality: character.personality,
    appearanceMemory: character.appearanceMemory,
    worldProfileId: character.worldProfileId,
    worldProfile: character.worldProfile,
  });
}

export type { CharacterConsistencyStatus };
