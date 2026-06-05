import { isAiDirectorStyleStrength } from "@/lib/studio-ai-director-interpreter";
import { isStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { isStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { isStudioMusicProfileId } from "@/lib/studio-music-profiles";
import { normalizeMusicIntensity } from "@/lib/studio-music-validation";
import { isStudioSoundProfileId, normalizeSoundDensity } from "@/lib/studio-sound-profiles";
import {
  AUDIO_PRIORITY_STRATEGIES,
  isStudioAudioStyleId,
} from "@/lib/studio-audio-production-profiles";
import {
  isStudioNarrationMode,
  isStudioVoiceProfileId,
} from "@/lib/studio-voice-profiles";

export const STUDIO_STORYBOARD_TITLE_MAX = 160;
export const STUDIO_STORYBOARD_TEXT_MAX = 4000;

export type StudioStoryboardCreateInput = {
  title: string;
  description?: string;
  promptStyleProfile?: string;
  directorProfile?: string;
};

export type StudioStoryboardUpdateInput = {
  title?: string;
  description?: string;
  promptStyleProfile?: string;
  directorProfile?: string;
  aiDirectorPrompt?: string;
  aiDirectorStyleStrength?: string;
  voiceEnabled?: boolean;
  voiceLanguage?: string;
  voiceStyle?: string;
  voiceProfile?: string;
  narrationMode?: string;
  voiceNarrationScript?: string;
  autoSelectImprovedImage?: boolean;
  musicEnabled?: boolean;
  musicStyle?: string;
  musicIntensity?: string;
  musicNarrativeRole?: string;
  musicNotes?: string;
  soundEnabled?: boolean;
  soundStyle?: string;
  soundDensity?: string;
  soundNotes?: string;
  audioProductionEnabled?: boolean;
  audioStyle?: string;
  audioPriorityStrategy?: string;
  audioNotes?: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function trimText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

export function validateStudioStoryboardCreateInput(
  raw: StudioStoryboardCreateInput
): ValidationResult<{
  title: string;
  description: string;
  promptStyleProfile: string;
  directorProfile: string;
}> {
  const title = raw.title?.trim() ?? "";
  if (!title) {
    return { ok: false, code: "TITLE_REQUIRED", message: "Title is required." };
  }
  if (title.length > STUDIO_STORYBOARD_TITLE_MAX) {
    return { ok: false, code: "TITLE_TOO_LONG", message: "Title is too long." };
  }
  const profile = raw.promptStyleProfile?.trim() ?? "commercial";
  if (!isStudioPromptStyleProfile(profile)) {
    return { ok: false, code: "INVALID_STYLE_PROFILE", message: "Invalid prompt style profile." };
  }
  const director = raw.directorProfile?.trim() ?? profile;
  if (!isStudioDirectorProfile(director)) {
    return { ok: false, code: "INVALID_DIRECTOR_PROFILE", message: "Invalid director profile." };
  }
  return {
    ok: true,
    value: {
      title,
      description: trimText(raw.description, STUDIO_STORYBOARD_TEXT_MAX),
      promptStyleProfile: profile,
      directorProfile: director,
    },
  };
}

export function validateStudioStoryboardUpdateInput(
  raw: StudioStoryboardUpdateInput
): ValidationResult<{
  title?: string;
  description?: string;
  promptStyleProfile?: string;
  directorProfile?: string;
  aiDirectorPrompt?: string;
  aiDirectorStyleStrength?: string;
  voiceEnabled?: boolean;
  voiceLanguage?: string;
  voiceStyle?: string;
  voiceProfile?: string;
  narrationMode?: string;
  voiceNarrationScript?: string;
  autoSelectImprovedImage?: boolean;
  musicEnabled?: boolean;
  musicStyle?: string;
  musicIntensity?: string;
  musicNarrativeRole?: string;
  musicNotes?: string;
  soundEnabled?: boolean;
  soundStyle?: string;
  soundDensity?: string;
  soundNotes?: string;
  audioProductionEnabled?: boolean;
  audioStyle?: string;
  audioPriorityStrategy?: string;
  audioNotes?: string;
}> {
  const patch: {
    title?: string;
    description?: string;
    promptStyleProfile?: string;
    directorProfile?: string;
    aiDirectorPrompt?: string;
    aiDirectorStyleStrength?: string;
    voiceEnabled?: boolean;
    voiceLanguage?: string;
    voiceStyle?: string;
    voiceProfile?: string;
    narrationMode?: string;
    voiceNarrationScript?: string;
    autoSelectImprovedImage?: boolean;
    musicEnabled?: boolean;
    musicStyle?: string;
    musicIntensity?: string;
    musicNarrativeRole?: string;
    musicNotes?: string;
    soundEnabled?: boolean;
    soundStyle?: string;
    soundDensity?: string;
    soundNotes?: string;
    audioProductionEnabled?: boolean;
    audioStyle?: string;
    audioPriorityStrategy?: string;
    audioNotes?: string;
  } = {};

  if (raw.title !== undefined) {
    const title = raw.title.trim();
    if (!title) {
      return { ok: false, code: "TITLE_REQUIRED", message: "Title is required." };
    }
    if (title.length > STUDIO_STORYBOARD_TITLE_MAX) {
      return { ok: false, code: "TITLE_TOO_LONG", message: "Title is too long." };
    }
    patch.title = title;
  }

  if (raw.description !== undefined) {
    patch.description = trimText(raw.description, STUDIO_STORYBOARD_TEXT_MAX);
  }

  if (raw.promptStyleProfile !== undefined) {
    const profile = raw.promptStyleProfile.trim();
    if (!isStudioPromptStyleProfile(profile)) {
      return { ok: false, code: "INVALID_STYLE_PROFILE", message: "Invalid prompt style profile." };
    }
    patch.promptStyleProfile = profile;
  }

  if (raw.directorProfile !== undefined) {
    const director = raw.directorProfile.trim();
    if (!isStudioDirectorProfile(director)) {
      return { ok: false, code: "INVALID_DIRECTOR_PROFILE", message: "Invalid director profile." };
    }
    patch.directorProfile = director;
  }

  if (raw.aiDirectorPrompt !== undefined) {
    patch.aiDirectorPrompt = trimText(raw.aiDirectorPrompt, STUDIO_STORYBOARD_TEXT_MAX);
  }

  if (raw.aiDirectorStyleStrength !== undefined) {
    const strength = raw.aiDirectorStyleStrength.trim().toLowerCase();
    if (!isAiDirectorStyleStrength(strength)) {
      return {
        ok: false,
        code: "INVALID_AI_DIRECTOR_STRENGTH",
        message: "Invalid AI director style strength.",
      };
    }
    patch.aiDirectorStyleStrength = strength;
  }

  if (raw.voiceEnabled !== undefined) {
    patch.voiceEnabled = Boolean(raw.voiceEnabled);
  }

  if (raw.voiceLanguage !== undefined) {
    const lang = raw.voiceLanguage.trim().toLowerCase().slice(0, 8);
    if (!lang) {
      return { ok: false, code: "INVALID_VOICE_LANGUAGE", message: "Invalid voice language." };
    }
    patch.voiceLanguage = lang;
  }

  if (raw.voiceStyle !== undefined) {
    patch.voiceStyle = trimText(raw.voiceStyle, 64);
  }

  if (raw.voiceProfile !== undefined) {
    const profile = raw.voiceProfile.trim().toLowerCase();
    if (!isStudioVoiceProfileId(profile)) {
      return { ok: false, code: "INVALID_VOICE_PROFILE", message: "Invalid voice profile." };
    }
    patch.voiceProfile = profile;
  }

  if (raw.narrationMode !== undefined) {
    const mode = raw.narrationMode.trim().toLowerCase();
    if (!isStudioNarrationMode(mode)) {
      return { ok: false, code: "INVALID_NARRATION_MODE", message: "Invalid narration mode." };
    }
    patch.narrationMode = mode;
  }

  if (raw.voiceNarrationScript !== undefined) {
    patch.voiceNarrationScript = trimText(raw.voiceNarrationScript, 12_000);
  }

  if (raw.autoSelectImprovedImage !== undefined) {
    patch.autoSelectImprovedImage = Boolean(raw.autoSelectImprovedImage);
  }

  if (raw.musicEnabled !== undefined) {
    patch.musicEnabled = Boolean(raw.musicEnabled);
  }
  if (raw.musicStyle !== undefined) {
    const style = raw.musicStyle.trim().toLowerCase();
    if (style && !isStudioMusicProfileId(style)) {
      return { ok: false, code: "INVALID_MUSIC_STYLE", message: "Invalid music profile." };
    }
    patch.musicStyle = style;
  }
  if (raw.musicIntensity !== undefined) {
    patch.musicIntensity = normalizeMusicIntensity(raw.musicIntensity);
  }
  if (raw.musicNarrativeRole !== undefined) {
    patch.musicNarrativeRole = trimText(raw.musicNarrativeRole, 120);
  }
  if (raw.musicNotes !== undefined) {
    patch.musicNotes = trimText(raw.musicNotes, STUDIO_STORYBOARD_TEXT_MAX);
  }

  if (raw.soundEnabled !== undefined) {
    patch.soundEnabled = Boolean(raw.soundEnabled);
  }
  if (raw.soundStyle !== undefined) {
    const style = raw.soundStyle.trim().toLowerCase();
    if (style && !isStudioSoundProfileId(style)) {
      return { ok: false, code: "INVALID_SOUND_STYLE", message: "Invalid sound profile." };
    }
    patch.soundStyle = style;
  }
  if (raw.soundDensity !== undefined) {
    patch.soundDensity = normalizeSoundDensity(raw.soundDensity);
  }
  if (raw.soundNotes !== undefined) {
    patch.soundNotes = trimText(raw.soundNotes, STUDIO_STORYBOARD_TEXT_MAX);
  }

  if (raw.audioProductionEnabled !== undefined) {
    patch.audioProductionEnabled = Boolean(raw.audioProductionEnabled);
  }
  if (raw.audioStyle !== undefined) {
    const style = raw.audioStyle.trim().toLowerCase();
    if (style && !isStudioAudioStyleId(style)) {
      return { ok: false, code: "INVALID_AUDIO_STYLE", message: "Invalid audio style." };
    }
    patch.audioStyle = style;
  }
  if (raw.audioPriorityStrategy !== undefined) {
    const strategy = raw.audioPriorityStrategy.trim().toLowerCase();
    if (
      strategy &&
      !(AUDIO_PRIORITY_STRATEGIES as readonly string[]).includes(strategy)
    ) {
      return {
        ok: false,
        code: "INVALID_AUDIO_STRATEGY",
        message: "Invalid audio priority strategy.",
      };
    }
    patch.audioPriorityStrategy = strategy || "balanced";
  }
  if (raw.audioNotes !== undefined) {
    patch.audioNotes = trimText(raw.audioNotes, STUDIO_STORYBOARD_TEXT_MAX);
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
