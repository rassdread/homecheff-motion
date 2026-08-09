/**
 * S.7C — Canonical dialogue planning (provider-neutral).
 * Scene → Speaker → Text → Emotion → Timing → Voice intent → Generation
 */

import {
  collectStoryboardCharacters,
  parseSpeakerTaggedScript,
  scriptUsesSpeakerTags,
} from "@/lib/studio-character-voice";
import { resolveVoiceIdentity } from "@/lib/studio-audio-voice-resolver";
import {
  normalizeStudioVoiceEmotion,
  type StudioVoiceEmotion,
} from "@/lib/studio-voice-emotion";
import {
  normalizeStudioVoiceStyle,
  type StudioVoiceStyle,
} from "@/lib/studio-voice-style";
import type { StudioVoiceVariantId } from "@/lib/studio-voice-variants";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type StudioDialogueConversationMode =
  | "single_speaker"
  | "multiple_speakers"
  | "conversation"
  | "interview"
  | "podcast"
  | "storytelling"
  | "commercial"
  | "documentary";

export const STUDIO_DIALOGUE_CONVERSATION_MODES: StudioDialogueConversationMode[] = [
  "single_speaker",
  "multiple_speakers",
  "conversation",
  "interview",
  "podcast",
  "storytelling",
  "commercial",
  "documentary",
];

export type StudioDialogueLine = {
  id: string;
  sceneId: string | null;
  sceneOrder: number | null;
  speakerCharacterId: string | null;
  speakerName: string | null;
  text: string;
  emotion: StudioVoiceEmotion;
  style: StudioVoiceStyle | null;
  timing: {
    estimatedSeconds: number | null;
    order: number;
  };
  voiceIntent: {
    variantId: StudioVoiceVariantId;
    language: string;
    voiceProfile: string | null;
    voiceLock: boolean;
    source: string;
  };
};

export type StudioDialoguePlan = {
  version: "7c.1";
  storyboardId: string;
  conversationMode: StudioDialogueConversationMode;
  language: string;
  lines: StudioDialogueLine[];
  /** Provider-neutral — GenerationJobs own execution later */
  providerNeutral: true;
};

function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((words / 2.5) * 10) / 10);
}

function detectConversationMode(
  storyboard: StudioStoryboardDetail,
  lineCount: number,
  speakerCount: number
): StudioDialogueConversationMode {
  const style = normalizeStudioVoiceStyle(storyboard.voiceStyle, "presentation");
  if (style === "podcast") return "podcast";
  if (style === "commercial") return "commercial";
  if (style === "documentary") return "documentary";
  if (style === "audiobook" || style === "movie") return "storytelling";
  if (speakerCount <= 1) return "single_speaker";
  if (lineCount >= 4 && speakerCount >= 2) return "conversation";
  return "multiple_speakers";
}

function findCharacterBySpeakerName(
  characters: ReturnType<typeof collectStoryboardCharacters>,
  speaker: string | null | undefined
) {
  const name = (speaker ?? "").trim().toLowerCase();
  if (!name || name === "narrator") return null;
  return characters.find((c) => c.name.toLowerCase() === name) ?? null;
}

/**
 * Build dialogue plan from storyboard narration script + scene speakers.
 * Does not call providers.
 */
export function buildStoryboardDialoguePlan(
  storyboard: StudioStoryboardDetail,
  options?: {
    language?: string | null;
    emotionDefault?: string | null;
    styleDefault?: string | null;
  }
): StudioDialoguePlan {
  const language = (
    options?.language ??
    storyboard.voiceLanguage ??
    "en"
  )
    .trim()
    .toLowerCase()
    .slice(0, 2);
  const emotionDefault = normalizeStudioVoiceEmotion(options?.emotionDefault, "neutral");
  const styleDefault = options?.styleDefault
    ? normalizeStudioVoiceStyle(options.styleDefault)
    : normalizeStudioVoiceStyle(storyboard.voiceStyle, "presentation");

  const characters = collectStoryboardCharacters(storyboard);
  const script = (storyboard.voiceNarrationScript ?? "").trim();
  const lines: StudioDialogueLine[] = [];

  if (script && scriptUsesSpeakerTags(script)) {
    const segments = parseSpeakerTaggedScript(script);
    segments.forEach((seg, index) => {
      const character = findCharacterBySpeakerName(characters, seg.speaker);
      const resolved = resolveVoiceIdentity({
        role: character ? "character" : "narrator",
        character,
        language,
        storyboardVoiceProfile: storyboard.voiceProfile,
        storyboardVoiceLanguage: language,
      });
      lines.push({
        id: `dlg-${index}`,
        sceneId: null,
        sceneOrder: null,
        speakerCharacterId: character?.id ?? seg.characterId,
        speakerName: seg.speaker || character?.name || "Narrator",
        text: seg.text,
        emotion: emotionDefault,
        style: styleDefault,
        timing: {
          estimatedSeconds: estimateSeconds(seg.text),
          order: seg.order ?? index,
        },
        voiceIntent: {
          variantId: "default",
          language: resolved.language,
          voiceProfile: resolved.voiceProfile,
          voiceLock: resolved.voiceLock,
          source: resolved.source,
        },
      });
    });
  } else if (script) {
    const resolved = resolveVoiceIdentity({
      role: "narrator",
      language,
      storyboardVoiceProfile: storyboard.voiceProfile,
      storyboardVoiceLanguage: language,
    });
    lines.push({
      id: "dlg-0",
      sceneId: null,
      sceneOrder: null,
      speakerCharacterId: null,
      speakerName: "Narrator",
      text: script,
      emotion: emotionDefault,
      style: styleDefault,
      timing: { estimatedSeconds: estimateSeconds(script), order: 0 },
      voiceIntent: {
        variantId: "default",
        language: resolved.language,
        voiceProfile: resolved.voiceProfile,
        voiceLock: false,
        source: resolved.source,
      },
    });
  } else {
    storyboard.scenes.forEach((scene, index) => {
      const primary = scene.characters?.[0] ?? null;
      const text = (scene.description || scene.title || "").trim();
      if (!text) return;
      const resolved = resolveVoiceIdentity({
        role: primary ? "character" : "narrator",
        character: primary,
        language,
        storyboardVoiceProfile: storyboard.voiceProfile,
        storyboardVoiceLanguage: language,
      });
      lines.push({
        id: `dlg-scene-${scene.id}`,
        sceneId: scene.id,
        sceneOrder: scene.order ?? index,
        speakerCharacterId: primary?.id ?? null,
        speakerName: primary?.name ?? "Narrator",
        text,
        emotion: normalizeStudioVoiceEmotion(scene.emotion, emotionDefault),
        style: styleDefault,
        timing: { estimatedSeconds: estimateSeconds(text), order: index },
        voiceIntent: {
          variantId: "default",
          language: resolved.language,
          voiceProfile: resolved.voiceProfile,
          voiceLock: resolved.voiceLock,
          source: resolved.source,
        },
      });
    });
  }

  const speakerIds = new Set(
    lines.map((l) => l.speakerCharacterId).filter(Boolean) as string[]
  );

  return {
    version: "7c.1",
    storyboardId: storyboard.id,
    conversationMode: detectConversationMode(storyboard, lines.length, speakerIds.size),
    language,
    lines,
    providerNeutral: true,
  };
}

/** Map dialogue plan lines into AudioSpecification seeds (no provider syntax). */
export function dialogueLineToAudioIntent(line: StudioDialogueLine): {
  script: string;
  emotion: StudioVoiceEmotion;
  language: string;
  characterId: string | null;
  voiceProfile: string | null;
  locked: boolean;
} {
  return {
    script: line.text,
    emotion: line.emotion,
    language: line.voiceIntent.language,
    characterId: line.speakerCharacterId,
    voiceProfile: line.voiceIntent.voiceProfile,
    locked: line.voiceIntent.voiceLock,
  };
}
