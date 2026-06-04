/**
 * Studio V33 — character voice profiles, assignments, and speaker resolution.
 */

import {
  getVoiceProfilePreset,
  normalizeStudioVoiceProfileId,
} from "@/lib/studio-voice-profiles";
import type {
  CharacterVoiceAssignment,
  CharacterVoiceConsistencyWarning,
  CharacterVoiceLanguageProfile,
  CharacterVoiceProfilesByLanguage,
  CharacterVoiceProfileSnapshot,
  SpeakerVoiceSegment,
} from "@/types/studio-character-voice";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

export function parseCharacterVoiceProfilesJson(raw: unknown): CharacterVoiceProfilesByLanguage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: CharacterVoiceProfilesByLanguage = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isStudioVoiceExecutionLanguage(key) || !value || typeof value !== "object") {
      continue;
    }
    const row = value as CharacterVoiceLanguageProfile;
    out[key] = {
      voiceEnabled: typeof row.voiceEnabled === "boolean" ? row.voiceEnabled : undefined,
      voiceProvider: typeof row.voiceProvider === "string" ? row.voiceProvider.trim() : undefined,
      voiceProfile:
        typeof row.voiceProfile === "string"
          ? normalizeStudioVoiceProfileId(row.voiceProfile)
          : undefined,
      voiceGender: typeof row.voiceGender === "string" ? row.voiceGender.trim() : undefined,
      voiceDescription:
        typeof row.voiceDescription === "string" ? row.voiceDescription.trim() : undefined,
    };
  }
  return out;
}

export function characterVoiceSnapshotFromRow(row: {
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceProfile: string;
  voiceLanguage: string;
  voiceGender: string;
  voiceDescription: string;
  voiceNotes: string;
  voiceLock: boolean;
  voiceProfilesJson: unknown;
}): CharacterVoiceProfileSnapshot {
  return {
    voiceEnabled: row.voiceEnabled,
    voiceProvider: row.voiceProvider?.trim() ?? "",
    voiceProfile: normalizeStudioVoiceProfileId(row.voiceProfile),
    voiceLanguage: (row.voiceLanguage?.trim() || "en").slice(0, 2),
    voiceGender: row.voiceGender?.trim() ?? "",
    voiceDescription: row.voiceDescription?.trim() ?? "",
    voiceNotes: row.voiceNotes?.trim() ?? "",
    voiceLock: row.voiceLock,
    voiceProfilesByLanguage: parseCharacterVoiceProfilesJson(row.voiceProfilesJson),
  };
}

export function resolveCharacterVoiceForLanguage(
  snapshot: CharacterVoiceProfileSnapshot,
  language: string
): CharacterVoiceProfileSnapshot {
  const lang = language.trim().toLowerCase().slice(0, 2);
  const override =
    isStudioVoiceExecutionLanguage(lang) ? snapshot.voiceProfilesByLanguage[lang] : undefined;
  if (!override) {
    return { ...snapshot, voiceLanguage: lang || snapshot.voiceLanguage };
  }
  return {
    ...snapshot,
    voiceLanguage: lang,
    voiceEnabled: override.voiceEnabled ?? snapshot.voiceEnabled,
    voiceProvider: override.voiceProvider?.trim() || snapshot.voiceProvider,
    voiceProfile: override.voiceProfile
      ? normalizeStudioVoiceProfileId(override.voiceProfile)
      : snapshot.voiceProfile,
    voiceGender: override.voiceGender?.trim() || snapshot.voiceGender,
    voiceDescription: override.voiceDescription?.trim() || snapshot.voiceDescription,
  };
}

export function buildCharacterVoiceAssignment(
  character: StudioCharacterListItem,
  language: string
): CharacterVoiceAssignment {
  const snap = resolveCharacterVoiceForLanguage(
    characterVoiceSnapshotFromRow({
      voiceEnabled: character.voiceEnabled ?? false,
      voiceProvider: character.voiceProvider ?? "",
      voiceProfile: character.voiceProfile ?? "",
      voiceLanguage: character.voiceLanguage ?? "en",
      voiceGender: character.voiceGender ?? "",
      voiceDescription: character.voiceDescription ?? "",
      voiceNotes: character.voiceNotes ?? "",
      voiceLock: character.voiceLock ?? false,
      voiceProfilesJson: character.voiceProfilesByLanguage ?? null,
    }),
    language
  );
  const preset = getVoiceProfilePreset(snap.voiceProfile);
  return {
    characterId: character.id,
    characterName: character.name,
    characterSlug: character.slug,
    voiceEnabled: snap.voiceEnabled,
    voiceProvider: snap.voiceProvider || "elevenlabs",
    voiceProfile: snap.voiceProfile,
    voiceLanguage: snap.voiceLanguage,
    voiceGender: snap.voiceGender,
    voiceDescription: snap.voiceDescription,
    voiceLock: snap.voiceLock,
    presetLabelKey: preset.labelKey,
  };
}

export function collectStoryboardCharacters(
  storyboard: StudioStoryboardDetail
): StudioCharacterListItem[] {
  const byId = new Map<string, StudioCharacterListItem>();
  for (const scene of storyboard.scenes) {
    for (const character of scene.characters ?? []) {
      if (!byId.has(character.id)) {
        byId.set(character.id, character);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildCharacterVoiceAssignments(
  storyboard: StudioStoryboardDetail,
  language: string
): CharacterVoiceAssignment[] {
  return collectStoryboardCharacters(storyboard)
    .filter((c) => c.voiceEnabled || Boolean(c.voiceProfile?.trim()))
    .map((c) => buildCharacterVoiceAssignment(c, language));
}

export function matchCharacterBySpeakerName(
  speaker: string,
  characters: StudioCharacterListItem[]
): StudioCharacterListItem | null {
  const norm = speaker.trim().toLowerCase();
  if (!norm) {
    return null;
  }
  return (
    characters.find(
      (c) =>
        c.name.trim().toLowerCase() === norm ||
        c.slug.trim().toLowerCase() === norm ||
        c.slug.replace(/-/g, " ") === norm
    ) ?? null
  );
}

/** Parse `[Speaker]` tagged lines from narration script. */
export function parseSpeakerTaggedScript(script: string): SpeakerVoiceSegment[] {
  const lines = script.split(/\r?\n/);
  const segments: SpeakerVoiceSegment[] = [];
  let currentSpeaker = "Narrator";
  let buffer: string[] = [];
  let order = 0;

  const flush = () => {
    const text = buffer.join(" ").trim();
    if (text) {
      segments.push({
        speaker: currentSpeaker,
        characterId: null,
        text,
        voiceProfile: "warm_narrator",
        voiceProvider: "elevenlabs",
        voiceLanguage: "en",
        order: order++,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const tag = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (tag) {
      flush();
      currentSpeaker = tag[1]!.trim();
      const rest = tag[2]!.trim();
      if (rest) {
        buffer.push(rest);
      }
    } else if (line.trim()) {
      buffer.push(line.trim());
    }
  }
  flush();
  return segments;
}

export function scriptUsesSpeakerTags(script: string): boolean {
  return /^\[[^\]]+\]/m.test(script.trim());
}

export function resolveSpeakerSegmentsWithCharacters(params: {
  script: string;
  characters: StudioCharacterListItem[];
  storyboardLanguage: string;
  fallbackVoiceProfile: string;
}): SpeakerVoiceSegment[] {
  const raw = parseSpeakerTaggedScript(params.script);
  return raw.map((seg, index) => {
    const character = matchCharacterBySpeakerName(seg.speaker, params.characters);
    if (character) {
      const assignment = buildCharacterVoiceAssignment(character, params.storyboardLanguage);
      return {
        ...seg,
        order: index,
        characterId: character.id,
        voiceProfile: assignment.voiceProfile,
        voiceProvider: assignment.voiceProvider,
        voiceLanguage: assignment.voiceLanguage,
      };
    }
    return {
      ...seg,
      order: index,
      voiceProfile: normalizeStudioVoiceProfileId(params.fallbackVoiceProfile),
      voiceLanguage: params.storyboardLanguage,
    };
  });
}

export function buildMultiCharacterNarrationScript(
  storyboard: StudioStoryboardDetail,
  language: string
): string {
  const characters = collectStoryboardCharacters(storyboard);
  const lines: string[] = [];
  const sorted = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  for (const scene of sorted) {
    const primary = scene.characters?.[0];
    const speaker = primary?.name?.trim() || "Narrator";
    const text =
      scene.description.trim() ||
      scene.action.trim() ||
      scene.title.trim() ||
      `Scene ${scene.order + 1}.`;
    lines.push(`[${speaker}]`);
    lines.push(text.endsWith(".") ? text : `${text}.`);
    lines.push("");
  }
  if (lines.length === 0 && characters.length > 0) {
    for (const c of characters) {
      if (c.voiceEnabled) {
        lines.push(`[${c.name}]`);
        lines.push(`Hello, I am ${c.name}.`);
        lines.push("");
      }
    }
  }
  return lines.join("\n").trim();
}

export function validateCharacterVoiceConsistency(params: {
  storyboard: StudioStoryboardDetail;
  language: string;
  usedVoiceProfileByCharacterId?: Record<string, string>;
}): CharacterVoiceConsistencyWarning[] {
  const warnings: CharacterVoiceConsistencyWarning[] = [];
  const assignments = buildCharacterVoiceAssignments(params.storyboard, params.language);
  const used = params.usedVoiceProfileByCharacterId ?? {};

  const allCharacters = collectStoryboardCharacters(params.storyboard);
  for (const character of allCharacters) {
    const assignment = buildCharacterVoiceAssignment(character, params.language);
    if (!assignment.voiceEnabled) {
      warnings.push({
        code: "character_voice_missing",
        severity: "medium",
        message: `${assignment.characterName} has no voice profile assigned.`,
        characterId: assignment.characterId,
        characterName: assignment.characterName,
      });
    }
  }

  for (const assignment of assignments) {
    const usedProfile = used[assignment.characterId];
    if (
      usedProfile &&
      assignment.voiceProfile &&
      normalizeStudioVoiceProfileId(usedProfile) !== assignment.voiceProfile
    ) {
      warnings.push({
        code: "character_voice_mismatch",
        severity: "medium",
        message: `${assignment.characterName} uses a different voice than the assigned profile.`,
        characterId: assignment.characterId,
        characterName: assignment.characterName,
      });
    }
    if (
      assignment.voiceLanguage &&
      assignment.voiceLanguage !== params.language &&
      assignment.voiceLock
    ) {
      warnings.push({
        code: "character_voice_language_mismatch",
        severity: "medium",
        message: `${assignment.characterName} voice language does not match storyboard (${params.language}).`,
        characterId: assignment.characterId,
        characterName: assignment.characterName,
      });
    }
  }

  return warnings;
}

export function resolveActiveSpeakerForScene(
  scene: { characters?: StudioCharacterListItem[] },
  language: string
): { speakerName: string; voiceProfile: string } | null {
  const primary = scene.characters?.[0];
  if (!primary) {
    return null;
  }
  const assignment = buildCharacterVoiceAssignment(primary, language);
  if (!assignment.voiceEnabled && !assignment.voiceProfile) {
    return null;
  }
  return {
    speakerName: primary.name,
    voiceProfile: assignment.voiceProfile,
  };
}

export function defaultCharacterVoicePreviewLine(name: string, language: string): string {
  const lang = language.slice(0, 2);
  if (lang === "nl") {
    return `Hallo, ik ben ${name}.`;
  }
  if (lang === "es") {
    return `Hola, soy ${name}.`;
  }
  if (lang === "fr") {
    return `Bonjour, je suis ${name}.`;
  }
  return `Hello, I am ${name}.`;
}
