/**
 * Studio V32 — post-merge voice mux + subtitle burn (non-fatal on failure).
 */

import path from "node:path";
import {
  mergeMotionAudioExportIntoHandoffStorage,
  parseMotionStudioAudioExport,
  readMotionAudioExportFromHandoffJson,
  shouldApplyStudioVoiceMux,
  shouldBurnStudioSubtitles,
} from "@/lib/motion-voice-export";
import { sanitizeMotionHandoffForStorage } from "@/lib/studio-motion-handoff-storage";
import {
  burnStudioNarrationSubtitles,
  muxStudioVoiceAudio,
} from "@/lib/studio-voice-ffmpeg";
import {
  mixStudioAudioLayers,
  muxStudioVideoWithMixedAudio,
} from "@/lib/studio-audio-mix-ffmpeg";
import {
  compactDiscreteSfxForMix,
  resolveDiscreteSfxPathsForMixNullable,
} from "@/lib/studio-audio-mix-assets";
import { sanitizeOverlayError } from "@/lib/video-ffmpeg-capability";
import { prisma } from "@/lib/prisma";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";
import { downloadLanguageExportVideoToFile } from "@/server/instant-premium/language-export-io";
import type { StudioAudioMixHandoffPlan } from "@/lib/studio-audio-mix-timeline";
import type { MotionStudioAudioExportJson } from "@/types/motion-voice-export";

export type StudioVoiceExportApplyResult = {
  outputVideoPath: string;
  audioMuxed: boolean;
  subtitleBurned: boolean;
  warning: string | null;
  preVoiceFinalVideoUrl: string | null;
};

async function persistMuxResult(params: {
  projectId: string;
  studioHandoffJson: unknown;
  settings: MotionStudioAudioExportJson;
  preVoiceFinalVideoUrl: string | null;
  audioMuxed: boolean;
  subtitleBurned: boolean;
  error: string | null;
}): Promise<void> {
  const base =
    params.studioHandoffJson && typeof params.studioHandoffJson === "object" && !Array.isArray(params.studioHandoffJson)
      ? (params.studioHandoffJson as Record<string, unknown>)
      : {};
  const current =
    parseMotionStudioAudioExport(base.motionAudioExport) ?? params.settings;
  const next = mergeMotionAudioExportIntoHandoffStorage(
    sanitizeMotionHandoffForStorage(base as Record<string, unknown>),
    {
      ...current,
      preVoiceFinalVideoUrl: params.preVoiceFinalVideoUrl ?? current.preVoiceFinalVideoUrl ?? null,
      lastMux: {
        audioMuxed: params.audioMuxed,
        subtitleBurned: params.subtitleBurned,
        at: new Date().toISOString(),
        error: params.error,
      },
    }
  );
  await prisma.animationProject.update({
    where: { id: params.projectId },
    data: { studioHandoffJson: next as object },
  });
}

export async function applyStudioVoiceExportToMergedVideo(params: {
  projectId: string;
  mergedVideoPath: string;
  workDir: string;
  studioHandoffJson: unknown;
  preVoiceFinalVideoUrl?: string | null;
  width?: number;
  height?: number;
}): Promise<StudioVoiceExportApplyResult> {
  const settings = readMotionAudioExportFromHandoffJson(params.studioHandoffJson);
  if (!settings) {
    return {
      outputVideoPath: params.mergedVideoPath,
      audioMuxed: false,
      subtitleBurned: false,
      warning: null,
      preVoiceFinalVideoUrl: null,
    };
  }

  const probed = await probeVideoSegment(params.mergedVideoPath);
  const videoDurationSec = probed?.durationSec ?? settings.voiceDurationSeconds ?? 8;
  const width = params.width ?? probed?.width ?? 1080;
  const height = params.height ?? probed?.height ?? 1920;

  let currentPath = params.mergedVideoPath;
  let audioMuxed = false;
  let subtitleBurned = false;
  const warnings: string[] = [];

  const applyVoice = shouldApplyStudioVoiceMux(settings);
  const applySubs = shouldBurnStudioSubtitles(settings);

  if (!applyVoice && !applySubs) {
    return {
      outputVideoPath: currentPath,
      audioMuxed: false,
      subtitleBurned: false,
      warning: null,
      preVoiceFinalVideoUrl: params.preVoiceFinalVideoUrl ?? null,
    };
  }

  if (applyVoice && (settings.voiceAudioUrl || settings.musicAudioUrl || settings.soundAudioUrl)) {
    const voiceLocal = settings.voiceAudioUrl
      ? path.join(params.workDir, "studio-voice-audio.bin")
      : null;
    const musicLocal = settings.musicAudioUrl
      ? path.join(params.workDir, "studio-music-audio.bin")
      : null;
    const soundLocal = settings.soundAudioUrl
      ? path.join(params.workDir, "studio-sound-audio.bin")
      : null;
    try {
      if (voiceLocal && settings.voiceAudioUrl) {
        await downloadLanguageExportVideoToFile(settings.voiceAudioUrl, voiceLocal);
      }
      if (musicLocal && settings.musicAudioUrl) {
        await downloadLanguageExportVideoToFile(settings.musicAudioUrl, musicLocal);
      }
      if (soundLocal && settings.soundAudioUrl) {
        await downloadLanguageExportVideoToFile(settings.soundAudioUrl, soundLocal);
      }

      const mixPlan: StudioAudioMixHandoffPlan = settings.mixPlan ?? {
        enabled: true,
        musicEnabled: Boolean(settings.musicAudioUrl),
        soundEnabled: Boolean(settings.soundAudioUrl),
        voiceEnabled: Boolean(settings.voiceAudioUrl),
        totalDurationSeconds: videoDurationSec,
        duckingMode: "music_under_voice",
        voiceVolume: 0.7,
        musicVolume: 0.35,
        soundVolume: 0.4,
        musicFadeInSeconds: 2,
        musicFadeOutSeconds: 2,
        musicHardCut: false,
        voiceAudioUrl: settings.voiceAudioUrl,
        musicAudioUrl: settings.musicAudioUrl ?? null,
        soundAudioUrl: settings.soundAudioUrl ?? null,
        musicAssetName: null,
        soundAssetName: null,
        sceneSegments: [],
        mixReady: true,
      };

      const discreteCues = (mixPlan.discreteSfx ?? []).filter((c) => c.url.trim());
      let discretePaths: string[] = [];
      let planDiscrete = discreteCues;
      if (discreteCues.length > 0) {
        const resolved = await resolveDiscreteSfxPathsForMixNullable({
          cues: discreteCues,
          workDir: params.workDir,
        });
        for (const w of resolved.warnings) {
          warnings.push(w);
        }
        const compacted = compactDiscreteSfxForMix(discreteCues, resolved.paths);
        discretePaths = compacted.paths;
        planDiscrete = compacted.cues;
        if (typeof console !== "undefined" && console.info) {
          console.info("[studio-audio-mix]", {
            projectId: params.projectId,
            timelineHash: mixPlan.timelineHash ?? null,
            sfxCueCount: discreteCues.length,
            uniqueAudioAssets: resolved.uniqueDownloaded,
            reusedAssets: resolved.reusedCount,
            missingOptional: resolved.missingOptional,
            duckingEnvelopeCount: mixPlan.duckingEnvelopes?.length ?? 0,
          });
        }
      }

      const planForRender: StudioAudioMixHandoffPlan = {
        ...mixPlan,
        totalDurationSeconds: videoDurationSec,
        discreteSfx: planDiscrete,
      };

      const mixedAudioPath = path.join(params.workDir, "studio-mixed-audio.aac");
      const useMultiLayer = Boolean(
        settings.mixEnabled &&
          (settings.musicAudioUrl ||
            settings.soundAudioUrl ||
            discretePaths.length > 0 ||
            (mixPlan.duckingEnvelopes?.length ?? 0) > 0)
      );

      if (useMultiLayer) {
        const mix = await mixStudioAudioLayers({
          voicePath: voiceLocal,
          musicPath: musicLocal,
          soundPath: soundLocal,
          discreteSfxPaths: discretePaths,
          outputPath: mixedAudioPath,
          plan: planForRender,
        });
        if (!mix.ok) {
          warnings.push(sanitizeOverlayError(mix.message));
        } else {
          const withVoicePath = path.join(params.workDir, "final-with-studio-voice.mp4");
          const mux = await muxStudioVideoWithMixedAudio({
            videoPath: currentPath,
            mixedAudioPath,
            outputPath: withVoicePath,
            videoDurationSeconds: videoDurationSec,
          });
          if (mux.ok) {
            currentPath = withVoicePath;
            audioMuxed = true;
          } else {
            warnings.push(sanitizeOverlayError(mux.message));
          }
        }
      } else if (voiceLocal) {
        const withVoicePath = path.join(params.workDir, "final-with-studio-voice.mp4");
        const mux = await muxStudioVoiceAudio({
          videoPath: currentPath,
          audioPath: voiceLocal,
          outputPath: withVoicePath,
          videoDurationSeconds: videoDurationSec,
        });
        if (mux.ok) {
          currentPath = withVoicePath;
          audioMuxed = true;
        } else {
          warnings.push(sanitizeOverlayError(mux.message));
        }
      }
    } catch (error) {
      warnings.push(
        sanitizeOverlayError(
          error instanceof Error ? error.message : "Studio voice download or mux failed."
        )
      );
    }
  }

  if (applySubs && settings.subtitleTrack?.entries?.length) {
    const withSubsPath = path.join(params.workDir, "final-with-studio-subs.mp4");
    const burn = await burnStudioNarrationSubtitles({
      inputVideoPath: currentPath,
      outputVideoPath: withSubsPath,
      entries: settings.subtitleTrack.entries,
      width,
      height,
      workDir: params.workDir,
    });
    if (burn.ok) {
      currentPath = withSubsPath;
      subtitleBurned = true;
    } else {
      warnings.push(sanitizeOverlayError(burn.message));
    }
  }

  const warning =
    warnings.length > 0
      ? `Video rendered, but voice/subtitle attachment failed: ${warnings.join(" ")}`
      : null;

  const updatedSettings: MotionStudioAudioExportJson = {
    ...settings,
    preVoiceFinalVideoUrl: params.preVoiceFinalVideoUrl ?? settings.preVoiceFinalVideoUrl ?? null,
    lastMux: {
      audioMuxed,
      subtitleBurned,
      at: new Date().toISOString(),
      error: warning,
    },
  };

  await persistMuxResult({
    projectId: params.projectId,
    studioHandoffJson: params.studioHandoffJson,
    settings: updatedSettings,
    preVoiceFinalVideoUrl: params.preVoiceFinalVideoUrl ?? null,
    audioMuxed,
    subtitleBurned,
    error: warning,
  });

  return {
    outputVideoPath: currentPath,
    audioMuxed,
    subtitleBurned,
    warning,
    preVoiceFinalVideoUrl: params.preVoiceFinalVideoUrl ?? null,
  };
}
