import { buildSrtFromSubtitleEntries, parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import { buildTimedVoiceSegments } from "@/lib/studio-voice-timing-execution";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type {
  MotionSubtitleTrackHandoff,
  MotionVoiceMetadata,
  MotionVoiceSegmentHandoff,
  SubtitleTrackEntry,
} from "@/types/studio-voice-execution";
import {
  buildCharacterVoiceAssignments,
  resolveActiveSpeakerForScene,
} from "@/lib/studio-character-voice";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type StoryboardVoiceRow = {
  language: string;
  provider: string;
  voiceProfile: string;
  voiceStyle: string;
  audioUrl: string;
  durationSeconds: number;
  status: string;
};

export type StoryboardSubtitleRow = {
  language: string;
  status: string;
  entriesJson: unknown;
};

export function buildMotionVoiceMetadata(
  storyboard: Pick<
    StudioStoryboardDetail,
    "voiceEnabled" | "voiceLanguage" | "voiceProfile" | "voiceStyle"
  >,
  voice: StoryboardVoiceRow | null
): MotionVoiceMetadata {
  const language = (voice?.language ?? storyboard.voiceLanguage ?? "en").slice(0, 2);
  const ready = Boolean(
    storyboard.voiceEnabled && voice?.status === "completed" && voice.audioUrl?.trim()
  );
  return {
    ready,
    language,
    provider: voice?.provider ?? "",
    voiceProfile: voice?.voiceProfile ?? storyboard.voiceProfile ?? "",
    voiceStyle: voice?.voiceStyle ?? storyboard.voiceStyle ?? "",
    durationSeconds: voice?.durationSeconds ?? 0,
    audioUrl: ready ? voice!.audioUrl.trim() : null,
  };
}

export function buildMotionVoiceSegmentsForHandoff(params: {
  storyboard: StudioStoryboardDetail;
  voiceDurationSeconds?: number;
}): MotionVoiceSegmentHandoff[] {
  if (!params.storyboard.voiceEnabled) {
    return [];
  }
  const report = analyzeVoiceDirector(params.storyboard);
  const preset = getVoiceProfilePreset(report.voiceProfile);
  const segments = buildTimedVoiceSegments({
    storyboard: params.storyboard,
    script: report.script,
    profile: preset,
    actualDurationSeconds: params.voiceDurationSeconds,
  });
  return segments.map((s) => ({
    sceneId: s.sceneId,
    order: s.order,
    startSeconds: s.startSeconds,
    endSeconds: s.endSeconds,
    durationSeconds: s.durationSeconds,
    text: s.text,
    speaker: s.speaker,
    characterId: s.characterId,
    voiceProfile: s.voiceProfile,
  }));
}

export function buildMotionSubtitleHandoff(
  subtitle: StoryboardSubtitleRow | null,
  fallbackEntries?: SubtitleTrackEntry[]
): MotionSubtitleTrackHandoff | null {
  const entries =
    subtitle
      ? parseSubtitleEntriesJson(subtitle.entriesJson)
      : (fallbackEntries ?? []);
  if (entries.length === 0) {
    return null;
  }
  const language = subtitle?.language ?? "en";
  return {
    language,
    available: subtitle?.status === "ready" || entries.length > 0,
    entries,
    srt: buildSrtFromSubtitleEntries(entries),
  };
}

export function attachVoiceToHandoffPayload(
  payload: MotionHandoffPayload,
  options: {
    storyboard: StudioStoryboardDetail;
    voice: StoryboardVoiceRow | null;
    subtitle: StoryboardSubtitleRow | null;
  }
): MotionHandoffPayload {
  const voiceMetadata = buildMotionVoiceMetadata(options.storyboard, options.voice);
  const segmentList = buildMotionVoiceSegmentsForHandoff({
    storyboard: options.storyboard,
    voiceDurationSeconds: voiceMetadata.durationSeconds || undefined,
  });
  const segmentByScene = new Map(segmentList.map((s) => [s.sceneId, s]));

  const subtitleTrack = buildMotionSubtitleHandoff(options.subtitle);
  const subtitleAvailability = Boolean(subtitleTrack?.available && subtitleTrack.entries.length > 0);

  const language = voiceMetadata.language;
  const characterVoiceAssignments = buildCharacterVoiceAssignments(
    options.storyboard,
    language
  );
  const characterVoiceProfiles = characterVoiceAssignments;

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const storyboardScene = options.storyboard.scenes.find((s) => s.id === scene.sceneId);
    const speaker = storyboardScene
      ? resolveActiveSpeakerForScene(storyboardScene, language)
      : null;
    return {
      ...scene,
      voiceSegment: segmentByScene.get(scene.sceneId) ?? undefined,
      activeSpeaker: speaker?.speakerName ?? null,
      speakerVoiceProfile: speaker?.voiceProfile ?? null,
    };
  });

  return {
    ...payload,
    voiceMetadata,
    voiceDuration: voiceMetadata.durationSeconds,
    subtitleTrack: subtitleTrack ?? undefined,
    subtitleAvailability,
    characterVoiceProfiles,
    characterVoiceAssignments,
    voiceSegments: segmentList,
    scenes,
  };
}
