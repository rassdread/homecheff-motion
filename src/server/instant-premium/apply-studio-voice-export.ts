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
import { sanitizeOverlayError } from "@/lib/video-ffmpeg-capability";
import { prisma } from "@/lib/prisma";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";
import { downloadLanguageExportVideoToFile } from "@/server/instant-premium/language-export-io";
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

  if (applyVoice && settings.voiceAudioUrl) {
    const audioLocal = path.join(params.workDir, "studio-voice-audio.bin");
    try {
      await downloadLanguageExportVideoToFile(settings.voiceAudioUrl, audioLocal);
      const withVoicePath = path.join(params.workDir, "final-with-studio-voice.mp4");
      const mux = await muxStudioVoiceAudio({
        videoPath: currentPath,
        audioPath: audioLocal,
        outputPath: withVoicePath,
        videoDurationSeconds: videoDurationSec,
      });
      if (mux.ok) {
        currentPath = withVoicePath;
        audioMuxed = true;
      } else {
        warnings.push(sanitizeOverlayError(mux.message));
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
