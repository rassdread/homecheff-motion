/**
 * Publish final cut — mux voice/music from production config into exported video.
 * Reuses studio-audio-mix-ffmpeg stack.
 */

import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { mixStudioAudioLayers, muxStudioVideoWithMixedAudio } from "@/lib/studio-audio-mix-ffmpeg";
import { loadPublishProductionFromProject } from "@/lib/publish-media-production";
import type { PublishProject } from "@/types/publish-overlay";

export type PublishAudioMuxInput = {
  project: PublishProject;
  videoPath: string;
  tmpDir: string;
};

async function resolvePublishAudioLocalPath(
  source: string | null | undefined,
  tmpDir: string,
  label: string
): Promise<string | undefined> {
  const trimmed = source?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  await mkdir(tmpDir, { recursive: true });
  const extension = path.extname(new URL(trimmed).pathname) || ".m4a";
  const localPath = path.join(tmpDir, `${label}-${Date.now()}${extension}`);

  const response = await fetch(trimmed, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch remote audio (${response.status})`);
  }

  const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
  await pipeline(nodeStream, createWriteStream(localPath));
  return localPath;
}

export function publishProjectNeedsAudioMux(project: PublishProject): boolean {
  const production = loadPublishProductionFromProject(project);
  const voiceUrl = production.voice.audioUrl?.trim();
  const musicUrl = production.music.trackUrl?.trim();
  return Boolean(
    (production.voice.mode !== "none" && voiceUrl) ||
      (production.music.mode !== "none" && musicUrl)
  );
}

export async function applyPublishAudioMux(
  input: PublishAudioMuxInput
): Promise<{ ok: true; outputPath: string } | { ok: false; error: string }> {
  const production = loadPublishProductionFromProject(input.project);
  const voiceSource = production.voice.audioUrl?.trim();
  const musicSource = production.music.trackUrl?.trim();

  if (!voiceSource && !musicSource) {
    return { ok: true, outputPath: input.videoPath };
  }

  let voicePath: string | undefined;
  let musicPath: string | undefined;
  const fetchedPaths: string[] = [];

  try {
    voicePath = await resolvePublishAudioLocalPath(voiceSource, input.tmpDir, "voice");
    if (voicePath && voiceSource?.startsWith("http")) {
      fetchedPaths.push(voicePath);
    }
    musicPath = await resolvePublishAudioLocalPath(musicSource, input.tmpDir, "music");
    if (musicPath && musicSource?.startsWith("http")) {
      fetchedPaths.push(musicPath);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Remote audio fetch failed",
    };
  }

  const mixedAudioPath = path.join(input.tmpDir, `${input.project.id}-mixed-audio.m4a`);
  const outputPath = path.join(input.tmpDir, `${input.project.id}-with-audio.mp4`);

  const mixResult = await mixStudioAudioLayers({
    voicePath,
    musicPath,
    outputPath: mixedAudioPath,
    plan: {
      totalDurationSeconds: input.project.durationSeconds,
      duckingMode: "music_under_voice",
      voiceVolume: production.voice.volume / 100,
      musicVolume: production.music.volume / 100,
      soundVolume: 0.3,
      musicFadeInSeconds: production.music.fadeIn ? 2 : 0,
      musicFadeOutSeconds: production.music.fadeOut ? 2 : 0,
      musicHardCut: false,
      voiceAudioUrl: voiceSource ?? null,
      musicAudioUrl: musicSource ?? null,
      soundAudioUrl: null,
      musicAssetName: null,
      soundAssetName: null,
      sceneSegments: [],
      mixReady: true,
    },
  });

  if (!mixResult.ok) {
    await Promise.all(fetchedPaths.map((p) => unlink(p).catch(() => undefined)));
    return { ok: false, error: mixResult.message };
  }

  const muxResult = await muxStudioVideoWithMixedAudio({
    videoPath: input.videoPath,
    mixedAudioPath,
    outputPath,
    videoDurationSeconds: input.project.durationSeconds,
  });

  await Promise.all(fetchedPaths.map((p) => unlink(p).catch(() => undefined)));

  if (!muxResult.ok) {
    return { ok: false, error: muxResult.message };
  }

  return { ok: true, outputPath };
}
