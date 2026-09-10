/**
 * Mix background music onto a true-lipsync MP4 that already has baked speech.
 * Reuses studio-audio-mix-ffmpeg (voice-first / music_under_voice).
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mixStudioAudioLayers, muxStudioVideoWithMixedAudio } from "@/lib/studio-audio-mix-ffmpeg";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export type MixLipsyncMusicInput = {
  ownerId: string;
  projectId: string;
  /** Lipsync MP4 with baked speech. */
  videoUrl: string;
  /** Same TTS URL that drove lipsync (preferred speech source for mix). */
  voiceAudioUrl: string;
  musicTrackUrl: string;
  durationSeconds: number;
  /** 0–100; Simple Studio default bed under voice is ~35. */
  musicVolume?: number;
  voiceVolume?: number;
};

export type MixLipsyncMusicResult =
  | { ok: true; videoUrl: string }
  | { ok: false; code: string; message: string };

async function fetchToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch media (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

/**
 * Speech-dominant mix: TTS voice + quieter music bed remuxed onto lipsync video.
 * Does not destroy speech — rebuilds from the same voice asset used for lipsync.
 */
export async function mixLipsyncSpeechVideoWithMusic(
  input: MixLipsyncMusicInput,
): Promise<MixLipsyncMusicResult> {
  if (!input.videoUrl.startsWith("http")) {
    return { ok: false, code: "VIDEO_URL_REQUIRED", message: "Public lipsync video URL required." };
  }
  if (!input.voiceAudioUrl.startsWith("http")) {
    return { ok: false, code: "VOICE_URL_REQUIRED", message: "Public speech audio URL required." };
  }
  if (!input.musicTrackUrl.startsWith("http")) {
    return { ok: false, code: "MUSIC_URL_REQUIRED", message: "Public music URL required." };
  }

  const dir = await mkdtemp(path.join(tmpdir(), "hc-lipsync-mix-"));
  const videoPath = path.join(dir, "lipsync.mp4");
  const voicePath = path.join(dir, "voice.mp3");
  const musicPath = path.join(dir, "music.mp3");
  const mixedAudioPath = path.join(dir, "mixed.m4a");
  const outputPath = path.join(dir, "final.mp4");

  try {
    await Promise.all([
      fetchToFile(input.videoUrl, videoPath),
      fetchToFile(input.voiceAudioUrl, voicePath),
      fetchToFile(input.musicTrackUrl, musicPath),
    ]);

    const durationSeconds = Math.max(3, Math.min(60, input.durationSeconds || 15));
    const musicVolume = Math.max(0.05, Math.min(0.6, (input.musicVolume ?? 35) / 100));
    const voiceVolume = Math.max(0.5, Math.min(1.2, (input.voiceVolume ?? 100) / 100));

    const mixResult = await mixStudioAudioLayers({
      voicePath,
      musicPath,
      outputPath: mixedAudioPath,
      plan: {
        totalDurationSeconds: durationSeconds,
        duckingMode: "music_under_voice",
        voiceVolume,
        musicVolume,
        soundVolume: 0.3,
        musicFadeInSeconds: 2,
        musicFadeOutSeconds: 2,
        musicHardCut: false,
        voiceAudioUrl: input.voiceAudioUrl,
        musicAudioUrl: input.musicTrackUrl,
        soundAudioUrl: null,
        musicAssetName: null,
        soundAssetName: null,
        sceneSegments: [],
        mixReady: true,
      },
    });

    if (!mixResult.ok) {
      return { ok: false, code: "AUDIO_MIX_FAILED", message: mixResult.message };
    }

    const muxResult = await muxStudioVideoWithMixedAudio({
      videoPath,
      mixedAudioPath,
      outputPath,
      videoDurationSeconds: durationSeconds,
    });

    if (!muxResult.ok) {
      return { ok: false, code: "AUDIO_MUX_FAILED", message: muxResult.message };
    }

    const buf = await readFile(outputPath);
    const pathname = `studio/${input.ownerId}/lipsync/${input.projectId}/mixed-${Date.now()}.mp4`;
    const uploaded = await uploadPublicBlob({
      pathname,
      body: buf,
      contentType: "video/mp4",
      allowOverwrite: true,
      context: { uploadTarget: pathname, provider: "studio_lipsync_music_mix" },
    });

    return { ok: true, videoUrl: uploaded.url };
  } catch (error) {
    return {
      ok: false,
      code: "LIPSYNC_MUSIC_MIX_ERROR",
      message: error instanceof Error ? error.message : "Music mix failed.",
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
