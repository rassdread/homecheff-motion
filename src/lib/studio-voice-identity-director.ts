/**
 * Studio V39 — Voice Identity Director (lock enforcement, multi-language validation).
 */

import {
  collectStoryboardCharacters,
} from "@/lib/studio-character-voice";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import {
  normalizeVoiceIdentityLanguage,
  resolveCharacterVoiceIdentity,
  resolveCharacterVoiceIdentitiesForLanguages,
} from "@/lib/studio-voice-identity-resolver";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import type {
  CharacterLanguageVoiceRow,
  MotionVoiceIdentityHandoffPlan,
  ResolvedCharacterVoiceIdentity,
  VoiceIdentityPlan,
  VoiceIdentityWarning,
} from "@/types/studio-voice-identity";
import { VOICE_IDENTITY_LANGUAGES } from "@/types/studio-voice-identity";

function identityToAssignment(identity: ResolvedCharacterVoiceIdentity): CharacterVoiceAssignment {
  return {
    characterId: identity.characterId,
    characterName: identity.characterName,
    characterSlug: identity.characterName.toLowerCase().replace(/\s+/g, "-"),
    voiceEnabled: identity.voiceEnabled,
    voiceProvider: identity.voiceProvider,
    voiceProfile: identity.voiceProfile,
    voiceLanguage: identity.language,
    voiceGender: identity.voiceGender,
    voiceDescription: identity.voiceDescription,
    voiceLock: identity.voiceLock,
    presetLabelKey: identity.presetLabelKey,
  };
}

function buildLanguageRows(characters: ReturnType<typeof collectStoryboardCharacters>): CharacterLanguageVoiceRow[] {
  const rows: CharacterLanguageVoiceRow[] = [];
  for (const character of characters) {
    for (const lang of VOICE_IDENTITY_LANGUAGES) {
      const identity = resolveCharacterVoiceIdentity({ character, language: lang });
      rows.push({
        characterId: character.id,
        characterName: character.name,
        language: lang,
        displayLabel: identity.displayLabel,
        voiceProfile: identity.voiceProfile,
        voiceLock: identity.voiceLock,
        hasProfile: identity.voiceEnabled || Boolean(identity.voiceProfile),
      });
    }
  }
  return rows;
}

function detectVoiceIdentityWarnings(params: {
  storyboard: StudioStoryboardDetail;
  characters: ReturnType<typeof collectStoryboardCharacters>;
  storyboardLanguage: string;
  resolved: ResolvedCharacterVoiceIdentity[];
}): VoiceIdentityWarning[] {
  const warnings: VoiceIdentityWarning[] = [];
  const storyLang = params.storyboardLanguage;
  const storyProfile = params.storyboard.voiceProfile?.trim();

  for (const character of params.characters) {
    const identity = params.resolved.find(
      (r) => r.characterId === character.id && r.language === storyLang
    );
    if (!identity) {
      continue;
    }

    if (!identity.voiceEnabled && !identity.voiceProfile) {
      warnings.push({
        code: "voice_removed",
        severity: "warning",
        messageKey: "studio.voiceIdentity.warning.voiceRemoved",
        characterId: character.id,
        characterName: character.name,
      });
    }

    if (identity.voiceLock && storyProfile) {
      const storyNorm = storyProfile.toLowerCase();
      const lockedNorm = character.voiceProfile?.trim().toLowerCase();
      if (
        lockedNorm &&
        storyNorm !== lockedNorm &&
        !identity.languageOverrideApplied
      ) {
        warnings.push({
          code: "locked_voice_overridden",
          severity: "warning",
          messageKey: "studio.voiceIdentity.warning.lockedOverridden",
          params: { profile: storyProfile },
          characterId: character.id,
          characterName: character.name,
        });
      }
    }

    for (const lang of VOICE_IDENTITY_LANGUAGES) {
      const langIdentity = resolveCharacterVoiceIdentity({ character, language: lang });
      if (
        character.voiceEnabled &&
        !character.voiceProfilesByLanguage?.[lang]?.voiceProfile &&
        lang !== (character.voiceLanguage ?? "en").slice(0, 2) &&
        lang !== storyLang
      ) {
        warnings.push({
          code: "language_missing",
          severity: "info",
          messageKey: "studio.voiceIdentity.warning.languageMissing",
          params: { language: lang.toUpperCase() },
          characterId: character.id,
          characterName: character.name,
        });
      }
      if (
        langIdentity.voiceLock &&
        langIdentity.language !== character.voiceLanguage &&
        !character.voiceProfilesByLanguage?.[lang]
      ) {
        // fallback to base — already handled by resolver
      }
    }

    if (
      identity.voiceProfile &&
      storyProfile &&
      identity.voiceLock &&
      identity.voiceProfile !== getVoiceProfilePreset(storyProfile).id &&
      !identity.languageOverrideApplied
    ) {
      warnings.push({
        code: "voice_mismatch",
        severity: "warning",
        messageKey: "studio.voiceIdentity.warning.voiceMismatch",
        characterId: character.id,
        characterName: character.name,
      });
    }
  }

  const unsupported = storyLang;
  if (!(VOICE_IDENTITY_LANGUAGES as readonly string[]).includes(unsupported)) {
    warnings.push({
      code: "unsupported_language",
      severity: "warning",
      messageKey: "studio.voiceIdentity.warning.unsupportedLanguage",
      params: { language: unsupported.toUpperCase() },
    });
  }

  return warnings;
}

function buildIdentitySummary(rows: CharacterLanguageVoiceRow[]): string {
  const byChar = new Map<string, CharacterLanguageVoiceRow[]>();
  for (const row of rows) {
    const list = byChar.get(row.characterId) ?? [];
    list.push(row);
    byChar.set(row.characterId, list);
  }
  const parts: string[] = [];
  for (const [, list] of byChar) {
    const name = list[0]?.characterName ?? "Character";
    const langs = list
      .filter((r) => r.hasProfile)
      .slice(0, 3)
      .map((r) => `${r.language.toUpperCase()}: ${r.displayLabel}`)
      .join(", ");
    if (langs) {
      parts.push(`${name} (${langs})`);
    }
  }
  return parts.join(" · ") || "";
}

function computeIdentityScore(params: {
  characters: ReturnType<typeof collectStoryboardCharacters>;
  resolved: ResolvedCharacterVoiceIdentity[];
  warnings: VoiceIdentityWarning[];
}): number {
  if (params.characters.length === 0) {
    return 0;
  }
  const withVoice = params.resolved.filter((r) => r.voiceEnabled || r.voiceProfile).length;
  const ratio = withVoice / Math.max(1, params.resolved.length);
  const locked = params.resolved.filter((r) => r.voiceLock).length;
  const lockBonus = locked > 0 ? 10 : 0;
  const penalty = params.warnings.filter((w) => w.severity === "warning").length * 8;
  return Math.max(0, Math.min(100, Math.round(ratio * 70 + lockBonus + 20 - penalty)));
}

export function buildVoiceIdentityPlan(storyboard: StudioStoryboardDetail): VoiceIdentityPlan {
  const characters = collectStoryboardCharacters(storyboard);
  const storyboardLanguage = normalizeVoiceIdentityLanguage(storyboard.voiceLanguage ?? "en");
  const enabled = Boolean(storyboard.voiceEnabled) || characters.some((c) => c.voiceEnabled);

  const resolved: ResolvedCharacterVoiceIdentity[] = characters.flatMap((c) =>
    resolveCharacterVoiceIdentitiesForLanguages(c)
  );

  const storyResolved = characters.map((c) =>
    resolveCharacterVoiceIdentity({
      character: c,
      language: storyboardLanguage,
      attemptedOverrideProfile: storyboard.voiceProfile,
    })
  );

  const lockedAssignments = storyResolved.map(identityToAssignment);
  const languageRows = buildLanguageRows(characters);
  const warnings = detectVoiceIdentityWarnings({
    storyboard,
    characters,
    storyboardLanguage,
    resolved: storyResolved,
  });

  const recommendations: string[] = ["studio.voiceIdentity.recommendation.lockKeyCharacters"];
  if (characters.some((c) => c.voiceLock)) {
    recommendations.push("studio.voiceIdentity.recommendation.respectVoiceLock");
  }
  recommendations.push("studio.voiceIdentity.recommendation.fillLanguageProfiles");

  const identitySummary = buildIdentitySummary(languageRows);

  return {
    enabled,
    storyboardLanguage,
    identitySummary,
    resolvedProfiles: resolved,
    languageRows,
    lockedAssignments,
    warnings,
    recommendations,
    identityScore: computeIdentityScore({ characters, resolved: storyResolved, warnings }),
  };
}

export function buildMotionVoiceIdentityHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionVoiceIdentityHandoffPlan {
  const plan = buildVoiceIdentityPlan(storyboard);
  return {
    enabled: plan.enabled,
    identitySummary: plan.identitySummary,
    lockedVoiceAssignments: plan.lockedAssignments,
    resolvedVoiceProfiles: plan.resolvedProfiles,
    voiceIdentityWarnings: plan.warnings,
    recommendations: plan.recommendations,
  };
}

export function isVoiceIdentityPlanReady(plan: VoiceIdentityPlan): boolean {
  return (
    plan.enabled &&
    plan.lockedAssignments.length > 0 &&
    plan.warnings.every(
      (w) =>
        w.severity !== "warning" ||
        w.code === "language_missing" ||
        w.code === "voice_mismatch" ||
        w.code === "locked_voice_overridden"
    )
  );
}
