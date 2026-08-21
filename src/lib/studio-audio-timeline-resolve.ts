/**
 * S2E — Resolve StudioAudioTimeline from storyboard + assets + optional preset hints.
 * Pure / metadata only — 0 provider calls.
 */

import { createHash } from "node:crypto";
import {
  applyDialogueDurationPolicy,
  hashDialogueText,
  hashVoiceConfig,
  isVoiceAssetStale,
  DEFAULT_DIALOGUE_DURATION_POLICY,
} from "@/lib/studio-audio-dialogue-policy";
import { resolvePresetSfxAndAmbienceCues } from "@/lib/studio-audio-preset-cues";
import {
  resolveCanonicalVisualTimeline,
  visualTimelineHash,
} from "@/lib/studio-visual-timeline";
import {
  duckingMusicMultiplier,
  fadeSecondsFromEndBehavior,
  fadeSecondsFromStartBehavior,
} from "@/lib/studio-audio-mix-timeline";
import { isAudioDuckingMode } from "@/lib/studio-audio-production-validation";
import type { AudioDuckingMode } from "@/types/studio-audio-production-director";
import type {
  DialogueDurationPolicy,
  StudioAudioMixExecutionPlan,
  StudioAudioTimeline,
  StudioAudioTimelineStatus,
  StudioDuckingCue,
  StudioMusicCue,
  StudioSubtitleCue,
  StudioVoiceCue,
} from "@/types/studio-audio-timeline";
import { STUDIO_AUDIO_TIMELINE_VERSION } from "@/types/studio-audio-timeline";

export type ResolveAudioTimelineScene = {
  id: string;
  order: number;
  durationSeconds: number;
  musicTransitionType?: string;
  duckingMode?: string | null;
  action?: string | null;
  title?: string | null;
};

export type ResolveAudioTimelineInput = {
  projectId: string;
  scenes: ResolveAudioTimelineScene[];
  voiceEnabled?: boolean;
  voiceAudioUrl?: string | null;
  voiceAssetId?: string | null;
  voiceDurationSeconds?: number | null;
  /** Per-scene or full narration text for hashing / cues. */
  voiceLines?: Array<{
    sceneId: string;
    text: string;
    speakerId?: string | null;
    startOffsetMs?: number;
    durationMs?: number;
  }>;
  voiceProfile?: string | null;
  voiceLanguage?: string | null;
  voiceProvider?: string | null;
  /** Stored hashes on existing voice asset (staleness). */
  assetTextHash?: string | null;
  assetVoiceConfigHash?: string | null;
  musicEnabled?: boolean;
  musicAudioUrl?: string | null;
  musicAssetId?: string | null;
  musicSourceOffsetMs?: number;
  musicFadeInBehavior?: string;
  musicFadeOutBehavior?: string;
  musicVolume?: number;
  soundEnabled?: boolean;
  soundAudioUrl?: string | null;
  soundAssetId?: string | null;
  soundVolume?: number;
  duckingMode?: string | null;
  sfxSuggestions?: string[];
  soundNotes?: string | null;
  musicMood?: string | null;
  subtitleEntries?: Array<{
    sceneId?: string | null;
    startMs: number;
    endMs: number;
    text: string;
    language?: string;
  }>;
  dialoguePolicy?: DialogueDurationPolicy;
};

function sha(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

function timelineHashFrom(parts: string[]): string {
  return createHash("sha256").update(parts.join("||")).digest("hex").slice(0, 32);
}

/**
 * Build canonical audio timeline anchored to visual scene spans.
 */
export function resolveStudioAudioTimeline(
  input: ResolveAudioTimelineInput
): StudioAudioTimeline {
  const statuses: StudioAudioTimelineStatus[] = [];
  const policy = input.dialoguePolicy ?? DEFAULT_DIALOGUE_DURATION_POLICY;

  // First pass: fit voice vs scene to compute duration overrides
  const durationOverridesMs: Record<string, number> = {};
  const lines = input.voiceLines ?? [];
  for (const line of lines) {
    const scene = input.scenes.find((s) => s.id === line.sceneId);
    if (!scene) continue;
    const visualMs = Math.round(Math.max(0.5, scene.durationSeconds || 5) * 1000);
    const voiceMs =
      line.durationMs ??
      (input.voiceDurationSeconds && lines.length === 1
        ? Math.round(input.voiceDurationSeconds * 1000)
        : Math.max(500, Math.round(line.text.trim().split(/\s+/).length * 400)));
    const fit = applyDialogueDurationPolicy({
      sceneId: line.sceneId,
      visualDurationMs: visualMs,
      voiceDurationMs: voiceMs,
      policy,
    });
    if (fit.extended) {
      durationOverridesMs[line.sceneId] = fit.effectiveDurationMs;
    }
    if (fit.status === "VOICE_TOO_LONG") {
      statuses.push("VOICE_TOO_LONG");
    }
  }

  // Single full voice asset without per-scene lines: apply to first scene
  if (
    lines.length === 0 &&
    input.voiceEnabled &&
    input.voiceDurationSeconds &&
    input.voiceDurationSeconds > 0 &&
    input.scenes[0]
  ) {
    const scene = input.scenes[0];
    const visualMs = Math.round(Math.max(0.5, scene.durationSeconds || 5) * 1000);
    const voiceMs = Math.round(input.voiceDurationSeconds * 1000);
    const fit = applyDialogueDurationPolicy({
      sceneId: scene.id,
      visualDurationMs: visualMs,
      voiceDurationMs: voiceMs,
      policy,
    });
    if (fit.extended) {
      durationOverridesMs[scene.id] = fit.effectiveDurationMs;
    }
    if (fit.status === "VOICE_TOO_LONG") {
      statuses.push("VOICE_TOO_LONG");
    }
  }

  const visual = resolveCanonicalVisualTimeline({
    projectId: input.projectId,
    scenes: input.scenes,
    durationOverridesMs,
  });

  const spanById = new Map(visual.sceneSpans.map((s) => [s.sceneId, s]));
  const dialogueText = lines.map((l) => l.text).join("\n");
  const dialogueHash = hashDialogueText(
    dialogueText || (input.voiceEnabled ? `voice:${input.voiceAssetId ?? "row"}` : "")
  );
  const voiceConfigHash = hashVoiceConfig({
    voiceProfile: input.voiceProfile,
    voiceLanguage: input.voiceLanguage,
    voiceProvider: input.voiceProvider,
  });

  const voice: StudioVoiceCue[] = [];
  let voiceSeq = 0;

  if (input.voiceEnabled && lines.length > 0) {
    for (const line of lines) {
      const span = spanById.get(line.sceneId);
      if (!span) continue;
      const offset = line.startOffsetMs ?? 200;
      const durationMs =
        line.durationMs ??
        Math.min(
          span.visualDurationMs - offset,
          Math.max(500, Math.round(line.text.trim().split(/\s+/).length * 400))
        );
      const startMs = span.startMs + offset;
      const textHash = hashDialogueText(line.text);
      const cfg = hashVoiceConfig({
        voiceProfile: input.voiceProfile,
        voiceLanguage: input.voiceLanguage,
        voiceProvider: input.voiceProvider,
        speakerId: line.speakerId,
      });
      const stale = isVoiceAssetStale({
        currentTextHash: textHash,
        assetTextHash: input.assetTextHash,
        currentVoiceConfigHash: cfg,
        assetVoiceConfigHash: input.assetVoiceConfigHash,
      });
      if (stale) statuses.push("STALE_ASSET");
      voice.push({
        id: `voice_${++voiceSeq}`,
        kind: "VOICE_CUE",
        sceneId: line.sceneId,
        startMs,
        endMs: startMs + durationMs,
        durationMs,
        volume: 1,
        assetId: input.voiceAssetId ?? null,
        assetPointer: input.voiceAudioUrl ?? null,
        source: "voice_row",
        speakerId: line.speakerId ?? null,
        textHash,
        voiceConfigHash: cfg,
        stale,
      });
    }
  } else if (input.voiceEnabled && input.voiceAudioUrl) {
    const span = visual.sceneSpans[0];
    const durationMs = Math.round((input.voiceDurationSeconds ?? visual.totalDurationMs / 1000) * 1000);
    const startMs = span?.startMs ?? 0;
    const stale = isVoiceAssetStale({
      currentTextHash: dialogueHash,
      assetTextHash: input.assetTextHash,
      currentVoiceConfigHash: voiceConfigHash,
      assetVoiceConfigHash: input.assetVoiceConfigHash,
    });
    if (stale) statuses.push("STALE_ASSET");
    voice.push({
      id: `voice_${++voiceSeq}`,
      kind: "VOICE_CUE",
      sceneId: span?.sceneId ?? null,
      startMs,
      endMs: startMs + durationMs,
      durationMs,
      volume: 1,
      assetId: input.voiceAssetId ?? null,
      assetPointer: input.voiceAudioUrl,
      source: "voice_row",
      speakerId: null,
      textHash: dialogueHash,
      voiceConfigHash,
      stale,
    });
  }

  const duckingRaw = input.duckingMode ?? "music_under_voice";
  const duckingMode: AudioDuckingMode = isAudioDuckingMode(duckingRaw)
    ? (duckingRaw as AudioDuckingMode)
    : "music_under_voice";
  const hasVoice = voice.length > 0;

  const music: StudioMusicCue[] = [];
  if (input.musicEnabled && (input.musicAudioUrl || input.musicMood || input.musicAssetId)) {
    if (!input.musicAudioUrl && !input.musicAssetId) {
      statuses.push("MISSING_ASSET");
    }
    const fadeInMs = Math.round(
      fadeSecondsFromStartBehavior(input.musicFadeInBehavior ?? "fade_in") * 1000
    );
    const fadeOutMs = Math.round(
      fadeSecondsFromEndBehavior(input.musicFadeOutBehavior ?? "fade_out") * 1000
    );
    const baseVol = input.musicVolume ?? 0.35;
    music.push({
      id: "music_bed_0",
      kind: "MUSIC_CUE",
      sceneId: null,
      startMs: 0,
      endMs: visual.totalDurationMs,
      durationMs: visual.totalDurationMs,
      // S2E-P1: keep unducked base; timed envelopes apply gain in FFmpeg.
      volume: baseVol,
      assetId: input.musicAssetId ?? null,
      assetPointer: input.musicAudioUrl ?? null,
      source: input.musicAudioUrl ? "library" : "preset_hint",
      sourceOffsetMs: input.musicSourceOffsetMs ?? 0,
      loop: true,
      fadeInMs,
      fadeOutMs,
    });
  }

  const { sfx, ambience, unresolved } = resolvePresetSfxAndAmbienceCues({
    projectId: input.projectId,
    sceneSpans: visual.sceneSpans,
    sfxSuggestions: input.sfxSuggestions ?? [],
    soundNotes: input.soundNotes,
    soundAssetId: input.soundAssetId,
    soundAssetUrl: input.soundEnabled ? input.soundAudioUrl : null,
    defaultVolume: input.soundVolume ?? 0.5,
  });

  // If sound enabled with asset but no ambience from hints, add full-span ambience bed
  if (
    input.soundEnabled &&
    input.soundAudioUrl &&
    ambience.length === 0 &&
    sfx.every((c) => !c.assetPointer)
  ) {
    ambience.push({
      id: "amb_bed_0",
      kind: "AMBIENCE_CUE",
      sceneId: null,
      startMs: 0,
      endMs: visual.totalDurationMs,
      durationMs: visual.totalDurationMs,
      volume: input.soundVolume ?? 0.45,
      assetId: input.soundAssetId ?? null,
      assetPointer: input.soundAudioUrl,
      source: "library",
      cueType: "ambience",
      discrete: false,
    });
  }

  if (unresolved.length > 0) {
    statuses.push("UNRESOLVED_SFX");
  }

  // Apply static volume to discrete SFX that share sound asset URL when linked
  if (input.soundAudioUrl) {
    for (const cue of sfx) {
      if (!cue.assetPointer) {
        cue.assetPointer = input.soundAudioUrl;
        cue.assetId = input.soundAssetId ?? cue.assetId;
      }
    }
  }

  const ducking: StudioDuckingCue[] = [];
  let duckSeq = 0;
  for (const v of voice) {
    ducking.push({
      id: `duck_${++duckSeq}`,
      kind: "DUCKING_CUE",
      sceneId: v.sceneId,
      startMs: Math.max(0, v.startMs - 80),
      endMs: v.endMs + 120,
      durationMs: v.endMs - v.startMs + 200,
      volume: 1,
      assetId: null,
      assetPointer: null,
      source: "derived",
      targetTrack: "both",
      gainMultiplier: duckingMusicMultiplier(duckingMode, true),
      attackMs: 80,
      releaseMs: 200,
      sourceVoiceCueId: v.id,
    });
  }

  const subtitleCues: StudioSubtitleCue[] = (input.subtitleEntries ?? []).map((e, i) => ({
    id: `sub_${i + 1}`,
    kind: "SUBTITLE_CUE",
    sceneId: e.sceneId ?? null,
    startMs: e.startMs,
    endMs: e.endMs,
    durationMs: Math.max(0, e.endMs - e.startMs),
    volume: 0,
    assetId: null,
    assetPointer: null,
    source: "subtitle",
    text: e.text,
    language: e.language ?? "en",
  }));

  if (
    !voice.length &&
    !music.length &&
    !sfx.length &&
    !ambience.length &&
    !subtitleCues.length
  ) {
    statuses.push("EMPTY");
  } else if (!statuses.includes("MISSING_ASSET") && !statuses.includes("STALE_ASSET")) {
    statuses.push("READY");
  }

  const vHash = visualTimelineHash(visual);
  const musicConfigHash = sha([
    input.musicAssetId ?? "",
    String(input.musicSourceOffsetMs ?? 0),
    input.musicMood ?? "",
  ]);
  const sfxConfigHash = sha([
    ...(input.sfxSuggestions ?? []),
    input.soundNotes ?? "",
    input.soundAssetId ?? "",
  ]);

  const tHash = timelineHashFrom([
    vHash,
    dialogueHash,
    voiceConfigHash,
    musicConfigHash,
    sfxConfigHash,
    ...voice.map((c) => `${c.id}:${c.startMs}:${c.endMs}`),
    ...sfx.map((c) => `${c.cueType}:${c.startMs}`),
    ...ducking.map((c) => `${c.startMs}:${c.endMs}:${c.gainMultiplier}`),
  ]);

  return {
    version: STUDIO_AUDIO_TIMELINE_VERSION,
    projectId: input.projectId,
    totalDurationMs: visual.totalDurationMs,
    sceneSpans: visual.sceneSpans,
    tracks: { voice, music, sfx, ambience },
    ducking,
    subtitleCues,
    statuses: [...new Set(statuses)],
    timelineHash: tHash,
    sourceHashes: {
      visualHash: vHash,
      dialogueHash,
      voiceConfigHash,
      musicConfigHash,
      sfxConfigHash,
    },
    providerCalls: 0,
  };
}

/**
 * Collapse timeline into execution mix plan for FFmpeg / handoff.
 * Still 0 provider calls — only references existing asset pointers.
 */
export function buildAudioMixExecutionPlan(
  timeline: StudioAudioTimeline
): StudioAudioMixExecutionPlan {
  const voiceCue = timeline.tracks.voice[0];
  const musicCue = timeline.tracks.music[0];
  const ambCue = timeline.tracks.ambience[0];

  const discreteSfx = timeline.tracks.sfx
    .filter((c) => c.assetPointer)
    .map((c) => ({
      cueId: c.id,
      url: c.assetPointer!,
      startMs: c.startMs,
      durationMs: c.durationMs,
      volume: c.volume,
      assetId: c.assetId,
    }));

  // Deduplicate identical URL generation: many cues, one asset id
  return {
    version: STUDIO_AUDIO_TIMELINE_VERSION,
    totalDurationMs: timeline.totalDurationMs,
    timelineHash: timeline.timelineHash,
    voice: {
      url: voiceCue?.assetPointer ?? null,
      volume: voiceCue?.volume ?? 1,
    },
    music: {
      url: musicCue?.assetPointer ?? null,
      volume: musicCue?.volume ?? 0.35,
      fadeInMs: musicCue?.fadeInMs ?? 0,
      fadeOutMs: musicCue?.fadeOutMs ?? 0,
      loop: musicCue?.loop ?? true,
      sourceOffsetMs: musicCue?.sourceOffsetMs ?? 0,
    },
    ambience: {
      url: ambCue?.assetPointer ?? null,
      volume: ambCue?.volume ?? 0.2,
      loop: true,
    },
    discreteSfx,
    duckingEnvelopes: timeline.ducking.map((d) => ({
      startMs: d.startMs,
      endMs: d.endMs,
      musicGain: d.gainMultiplier,
      ambienceGain: Math.min(1, d.gainMultiplier + 0.15),
      attackMs: d.attackMs,
      releaseMs: d.releaseMs,
    })),
    staticDuckingApplied: false,
    providerCalls: 0,
  };
}

export function countUniqueSfxAssets(timeline: StudioAudioTimeline): number {
  const ids = new Set(
    timeline.tracks.sfx.map((c) => c.assetId ?? c.assetPointer).filter(Boolean)
  );
  return ids.size;
}
