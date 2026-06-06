import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import {
  MOTION_AUDIO_EXPORT_JSON_VERSION,
  type MotionStudioAudioExportJson,
  type MotionStudioAudioExportResponse,
  type MotionSubtitleExportMode,
} from "@/types/motion-voice-export";
import type { MotionSubtitleTrackHandoff, MotionVoiceMetadata } from "@/types/studio-voice-execution";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function defaultSubtitleModeForStudioVoice(
  hasSubtitleTrack: boolean
): MotionSubtitleExportMode {
  return hasSubtitleTrack ? "burn_in" : "off";
}

export function buildMotionStudioAudioExportFromHandoff(
  handoff: Pick<
    MotionHandoffPayload,
    "voiceMetadata" | "subtitleTrack" | "subtitleAvailability" | "audioMixPlan"
  >
): MotionStudioAudioExportJson {
  const voice = handoff.voiceMetadata;
  const subtitle = handoff.subtitleTrack ?? null;
  const mix = handoff.audioMixPlan ?? null;
  const hasVoice = Boolean(voice?.ready && voice.audioUrl?.trim());
  const hasSubs = Boolean(
    handoff.subtitleAvailability &&
      subtitle?.available &&
      (subtitle.entries?.length ?? 0) > 0
  );
  const mixEnabled = Boolean(
    mix?.mixReady && (mix.musicEnabled || mix.soundEnabled || mix.voiceEnabled)
  );

  return {
    version: MOTION_AUDIO_EXPORT_JSON_VERSION,
    voiceEnabled: hasVoice || Boolean(mix?.voiceEnabled),
    subtitlesEnabled: hasSubs,
    subtitleMode: defaultSubtitleModeForStudioVoice(hasSubs),
    voiceAudioUrl: voice?.audioUrl?.trim() || mix?.voiceAudioUrl?.trim() || null,
    voiceLanguage: voice?.language?.trim() || null,
    voiceProvider: voice?.provider?.trim() || null,
    voiceDurationSeconds:
      typeof voice?.durationSeconds === "number" && Number.isFinite(voice.durationSeconds)
        ? voice.durationSeconds
        : mix?.totalDurationSeconds ?? null,
    subtitleTrack: subtitle,
    subtitleFormat: "srt",
    mixEnabled,
    musicAudioUrl: mix?.musicAudioUrl ?? null,
    soundAudioUrl: mix?.soundAudioUrl ?? null,
    mixPlan: mix,
  };
}

export function parseMotionStudioAudioExport(raw: unknown): MotionStudioAudioExportJson | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  if (raw.version !== MOTION_AUDIO_EXPORT_JSON_VERSION) {
    return null;
  }
  const subtitleMode = raw.subtitleMode;
  const mode: MotionSubtitleExportMode =
    subtitleMode === "off" || subtitleMode === "burn_in" || subtitleMode === "metadata_only"
      ? subtitleMode
      : "off";

  const subtitleRaw = raw.subtitleTrack;
  let subtitleTrack: MotionSubtitleTrackHandoff | null = null;
  if (isPlainObject(subtitleRaw)) {
    const entries = Array.isArray(subtitleRaw.entries) ? subtitleRaw.entries : [];
    subtitleTrack = {
      language: typeof subtitleRaw.language === "string" ? subtitleRaw.language : "en",
      available: Boolean(subtitleRaw.available),
      entries: entries
        .filter((e) => isPlainObject(e))
        .map((e) => ({
          start: Number(e.start) || 0,
          end: Number(e.end) || 0,
          text: typeof e.text === "string" ? e.text : "",
          sceneId: typeof e.sceneId === "string" ? e.sceneId : undefined,
        })),
      srt: typeof subtitleRaw.srt === "string" ? subtitleRaw.srt : "",
    };
  }

  return {
    version: MOTION_AUDIO_EXPORT_JSON_VERSION,
    voiceEnabled: Boolean(raw.voiceEnabled),
    subtitlesEnabled: Boolean(raw.subtitlesEnabled),
    subtitleMode: mode,
    voiceAudioUrl:
      typeof raw.voiceAudioUrl === "string" && raw.voiceAudioUrl.trim()
        ? raw.voiceAudioUrl.trim()
        : null,
    voiceLanguage:
      typeof raw.voiceLanguage === "string" ? raw.voiceLanguage.trim() || null : null,
    voiceProvider:
      typeof raw.voiceProvider === "string" ? raw.voiceProvider.trim() || null : null,
    voiceDurationSeconds:
      typeof raw.voiceDurationSeconds === "number" && Number.isFinite(raw.voiceDurationSeconds)
        ? raw.voiceDurationSeconds
        : null,
    subtitleTrack,
    subtitleFormat: "srt",
    preVoiceFinalVideoUrl:
      typeof raw.preVoiceFinalVideoUrl === "string" ? raw.preVoiceFinalVideoUrl.trim() || null : null,
    lastMux: isPlainObject(raw.lastMux)
      ? {
          audioMuxed: Boolean(raw.lastMux.audioMuxed),
          subtitleBurned: Boolean(raw.lastMux.subtitleBurned),
          at: typeof raw.lastMux.at === "string" ? raw.lastMux.at : new Date().toISOString(),
          error:
            typeof raw.lastMux.error === "string" ? raw.lastMux.error.slice(0, 500) : null,
        }
      : undefined,
    mixEnabled: Boolean(raw.mixEnabled),
    musicAudioUrl:
      typeof raw.musicAudioUrl === "string" && raw.musicAudioUrl.trim()
        ? raw.musicAudioUrl.trim()
        : null,
    soundAudioUrl:
      typeof raw.soundAudioUrl === "string" && raw.soundAudioUrl.trim()
        ? raw.soundAudioUrl.trim()
        : null,
    mixPlan: isPlainObject(raw.mixPlan) ? (raw.mixPlan as MotionStudioAudioExportJson["mixPlan"]) : null,
  };
}

export function readMotionAudioExportFromHandoffJson(
  studioHandoffJson: unknown
): MotionStudioAudioExportJson | null {
  if (!isPlainObject(studioHandoffJson)) {
    return null;
  }
  return parseMotionStudioAudioExport(studioHandoffJson.motionAudioExport);
}

export function mergeMotionAudioExportIntoHandoffStorage(
  handoffStorage: Record<string, unknown>,
  audioExport: MotionStudioAudioExportJson
): Record<string, unknown> {
  return {
    ...handoffStorage,
    motionAudioExport: audioExport,
  };
}

export function resolveMotionStudioAudioExport(params: {
  studioHandoffJson: unknown;
  handoff?: MotionHandoffPayload | null;
}): MotionStudioAudioExportJson | null {
  const stored = readMotionAudioExportFromHandoffJson(params.studioHandoffJson);
  if (stored) {
    return stored;
  }
  if (params.handoff?.voiceMetadata || params.handoff?.subtitleTrack || params.handoff?.audioMixPlan) {
    return buildMotionStudioAudioExportFromHandoff(params.handoff);
  }
  const parsed = params.studioHandoffJson as MotionHandoffPayload | null;
  if (parsed?.voiceMetadata || parsed?.subtitleTrack || parsed?.audioMixPlan) {
    return buildMotionStudioAudioExportFromHandoff(parsed);
  }
  return null;
}

export function buildMotionStudioAudioExportResponse(params: {
  exportSettings: MotionStudioAudioExportJson | null;
  studioSourceStoryboardId: string | null;
}): MotionStudioAudioExportResponse | null {
  const settings = params.exportSettings;
  if (!settings) {
    return null;
  }
  const hasStudioVoice = Boolean(settings.voiceEnabled && settings.voiceAudioUrl);
  const hasSubtitleTrack = Boolean(
    settings.subtitlesEnabled &&
      settings.subtitleTrack?.available &&
      (settings.subtitleTrack.entries?.length ?? 0) > 0
  );
  return {
    ...settings,
    hasStudioVoice,
    hasSubtitleTrack,
    studioStoryboardId: params.studioSourceStoryboardId,
  };
}

export function voiceMetadataFromHandoffStorage(
  studioHandoffJson: unknown
): MotionVoiceMetadata | null {
  if (!isPlainObject(studioHandoffJson)) {
    return null;
  }
  const meta = studioHandoffJson.voiceMetadata;
  if (!isPlainObject(meta)) {
    return null;
  }
  return meta as MotionVoiceMetadata;
}

export function shouldApplyStudioVoiceMux(settings: MotionStudioAudioExportJson | null): boolean {
  if (!settings) {
    return false;
  }
  if (settings.voiceEnabled && settings.voiceAudioUrl?.trim()) {
    return true;
  }
  if (settings.mixEnabled) {
    return Boolean(
      settings.voiceAudioUrl?.trim()
        || settings.musicAudioUrl?.trim()
        || settings.soundAudioUrl?.trim()
    );
  }
  return false;
}

export function shouldBurnStudioSubtitles(settings: MotionStudioAudioExportJson | null): boolean {
  if (!settings?.subtitlesEnabled) {
    return false;
  }
  if (settings.subtitleMode !== "burn_in") {
    return false;
  }
  return Boolean(
    settings.subtitleTrack?.available && (settings.subtitleTrack.entries?.length ?? 0) > 0
  );
}

export function buildVoiceExportRenderSnapshot(
  settings: MotionStudioAudioExportJson | null
): Record<string, unknown> | null {
  if (!settings) {
    return null;
  }
  return {
    voiceAudioUrl: settings.voiceAudioUrl,
    voiceLanguage: settings.voiceLanguage,
    voiceProvider: settings.voiceProvider,
    voiceDurationSeconds: settings.voiceDurationSeconds,
    voiceEnabled: settings.voiceEnabled,
    subtitlesEnabled: settings.subtitlesEnabled,
    subtitleMode: settings.subtitleMode,
    subtitleEntryCount: settings.subtitleTrack?.entries?.length ?? 0,
    audioMuxed: settings.lastMux?.audioMuxed ?? false,
    subtitleBurned: settings.lastMux?.subtitleBurned ?? false,
  };
}

export function fullRerenderMayInvalidateSubtitleTiming(
  imageTimingChanged: boolean
): boolean {
  return imageTimingChanged;
}
