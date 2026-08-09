/**
 * S.7C — Storyboard voice casting (does not mutate Character identity).
 * Casting belongs to Storyboards; identity belongs to Characters.
 */

import { buildCharacterVoiceOrchestration } from "@/lib/studio-character-voice-orchestration";
import { resolveVoiceIdentity } from "@/lib/studio-audio-voice-resolver";
import type { StudioVoiceVariantId } from "@/lib/studio-voice-variants";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export const STUDIO_VOICE_CAST_ROLES = [
  "narrator",
  "character",
  "background",
  "crowd",
  "commercial",
] as const;

export type StudioVoiceCastRole = (typeof STUDIO_VOICE_CAST_ROLES)[number];

export type StudioVoiceCastAssignment = {
  role: StudioVoiceCastRole;
  characterId: string | null;
  characterName: string | null;
  /** Casting may pick a variant — identity still Character-owned */
  variantId: StudioVoiceVariantId | null;
  voiceProfile: string | null;
  voiceLock: boolean;
  source: "character" | "narrator" | "project_default" | "unassigned_fallback";
  reason: string;
};

export type StudioVoiceCastingPlan = {
  version: "7c.1";
  storyboardId: string;
  language: string;
  assignments: StudioVoiceCastAssignment[];
  /** Character identity is never rewritten by casting */
  mutatesCharacterIdentity: false;
};

export function buildStoryboardVoiceCastingPlan(
  storyboard: StudioStoryboardDetail,
  language?: string | null
): StudioVoiceCastingPlan {
  const lang = (language ?? storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const orchestration = buildCharacterVoiceOrchestration({
    storyboard,
    language: lang,
  });

  const assignments: StudioVoiceCastAssignment[] = [];

  // Narrator / project default from storyboard
  const narrator = resolveVoiceIdentity({
    role: "narrator",
    language: lang,
    storyboardVoiceProfile: storyboard.voiceProfile,
    storyboardVoiceLanguage: lang,
  });
  assignments.push({
    role: "narrator",
    characterId: null,
    characterName: null,
    variantId: null,
    voiceProfile: narrator.voiceProfile,
    voiceLock: false,
    source: narrator.source,
    reason: narrator.reason,
  });

  for (const member of orchestration.castMembers) {
    const character = orchestration.voiceAssignments.find(
      (a) => a.characterId === member.characterId
    );
    const resolved = resolveVoiceIdentity({
      role: "character",
      language: lang,
      character: storyboard.scenes
        .flatMap((s) => s.characters ?? [])
        .find((c) => c.id === member.characterId),
      storyboardVoiceProfile: storyboard.voiceProfile,
      storyboardVoiceLanguage: lang,
    });

    assignments.push({
      role: "character",
      characterId: member.characterId,
      characterName: member.characterName,
      variantId: "default",
      voiceProfile: resolved.voiceProfile || character?.voiceProfile || member.voiceProfile,
      voiceLock: resolved.voiceLock,
      source: resolved.source,
      reason: resolved.reason,
    });
  }

  // Optional commercial / background slots remain unassigned unless linked later
  for (const role of ["background", "crowd", "commercial"] as const) {
    if (!assignments.some((a) => a.role === role)) {
      assignments.push({
        role,
        characterId: null,
        characterName: null,
        variantId: null,
        voiceProfile: null,
        voiceLock: false,
        source: "unassigned_fallback",
        reason: `Casting slot "${role}" available — does not alter Character identity.`,
      });
    }
  }

  return {
    version: "7c.1",
    storyboardId: storyboard.id,
    language: lang,
    assignments,
    mutatesCharacterIdentity: false,
  };
}
