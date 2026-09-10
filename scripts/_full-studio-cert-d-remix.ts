#!/usr/bin/env npx tsx
/**
 * Re-run Scenario D only with current S2E-P1 mixer (voice pad + duration=longest).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mixStudioAudioLayers,
  muxStudioVideoWithMixedAudio,
} from "../src/lib/studio-audio-mix-ffmpeg";
import type { StudioAudioMixPlan } from "../src/lib/studio-audio-mix-timeline";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const MEDIA = join(OUT, "audio-final");
const LIVE = join(OUT, "CERT-PROVIDER-CLOSEOUT-LIVE.json");
const MUSIC = join(ROOT, "docs/audits/px4a7-prod-cert/fixtures/px4a7-music-70s.mp3");

function ensureTone(path: string, freq: number, seconds: number): void {
  if (existsSync(path)) return;
  execFileSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${seconds}`, "-c:a", "libmp3lame", path],
    { stdio: "pipe" }
  );
}

function ensureSilentVideo(path: string, seconds: number): void {
  if (existsSync(path)) return;
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=black:s=720x1280:d=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=stereo",
      "-t",
      String(seconds),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      path,
    ],
    { stdio: "pipe" }
  );
}

function levelAt(path: string, t0: number, t1: number): number | null {
  try {
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-ss",
        String(t0),
        "-t",
        String(t1 - t0),
        "-i",
        path,
        "-af",
        "volumedetect",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return null;
  } catch (e) {
    const msg =
      e instanceof Error && "stderr" in e ? String((e as { stderr: Buffer }).stderr) : String(e);
    const m = msg.match(/mean_volume:\s*([-\d.]+)/);
    return m ? Number(m[1]) : null;
  }
}

function probeDuration(path: string): number {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
      { encoding: "utf8" }
    ).trim()
  );
}

async function main(): Promise<void> {
  mkdirSync(MEDIA, { recursive: true });
  const videoPath = join(MEDIA, "base.mp4");
  const voicePath = join(MEDIA, "voice.mp3");
  const musicPath = existsSync(MUSIC) ? MUSIC : join(MEDIA, "music.mp3");
  const ambiencePath = join(MEDIA, "ambience.mp3");
  const sfx1 = join(MEDIA, "sfx-bell.mp3");
  const sfx2 = join(MEDIA, "sfx-box.mp3");
  const outMix = join(MEDIA, "final-mix.m4a");
  const outMp4 = join(MEDIA, "final-export.mp4");

  // Force regenerate tones so voice isn't sticky-wrong
  for (const p of [voicePath, ambiencePath, sfx1, sfx2, outMix, outMp4]) {
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(p);
    } catch {
      /* ignore */
    }
  }

  ensureSilentVideo(videoPath, 10);
  ensureTone(voicePath, 440, 2.5);
  if (!existsSync(musicPath)) ensureTone(musicPath, 220, 12);
  ensureTone(ambiencePath, 110, 12);
  ensureTone(sfx1, 880, 0.3);
  ensureTone(sfx2, 660, 0.25);

  const timelineHash = createHash("sha256")
    .update("voice@2-4.5|sfx@1|sfx@5.5|duck|v2")
    .digest("hex")
    .slice(0, 16);

  const plan: StudioAudioMixPlan = {
    totalDurationSeconds: 10,
    duckingMode: "music_under_voice",
    voiceVolume: 1,
    musicVolume: 0.7,
    soundVolume: 0.35,
    musicFadeInSeconds: 0.3,
    musicFadeOutSeconds: 0.5,
    musicHardCut: false,
    voiceAudioUrl: voicePath,
    musicAudioUrl: musicPath,
    soundAudioUrl: ambiencePath,
    musicAssetName: "cert-music",
    soundAssetName: "cert-ambience",
    sceneSegments: [],
    mixReady: true,
    timelineHash,
    discreteSfx: [
      {
        cueId: "bell",
        url: sfx1,
        startSeconds: 1.0,
        durationSeconds: 0.3,
        volume: 0.9,
        assetId: "sfx1",
      },
      {
        cueId: "box",
        url: sfx2,
        startSeconds: 5.5,
        durationSeconds: 0.25,
        volume: 0.9,
        assetId: "sfx2",
      },
    ],
    duckingEnvelopes: [
      {
        startSeconds: 2,
        endSeconds: 4.5,
        musicGain: 0.25,
        ambienceGain: 0.9,
        attackSeconds: 0.15,
        releaseSeconds: 0.35,
      },
    ],
  };

  const mix = await mixStudioAudioLayers({
    plan,
    voicePath,
    musicPath,
    soundPath: ambiencePath,
    discreteSfxPaths: [sfx1, sfx2],
    outputPath: outMix,
  });
  if (!mix.ok) {
    console.error("mix failed", mix);
    process.exit(1);
  }
  const mux = await muxStudioVideoWithMixedAudio({
    videoPath,
    mixedAudioPath: outMix,
    outputPath: outMp4,
    videoDurationSeconds: 10,
  });
  if (!mux.ok) {
    console.error("mux failed", mux);
    process.exit(1);
  }

  const mixDur = probeDuration(outMix);
  const mp4Dur = probeDuration(outMp4);
  const levels = {
    before: levelAt(outMix, 0.2, 1.5),
    sfx1: levelAt(outMix, 0.95, 1.3),
    duringVoice: levelAt(outMix, 2.2, 4.0),
    afterVoice: levelAt(outMix, 5.0, 5.4),
    sfx2: levelAt(outMix, 5.45, 5.8),
    afterSfx: levelAt(outMix, 6.0, 8.0),
  };

  const duckingOk =
    levels.before != null &&
    levels.duringVoice != null &&
    levels.afterVoice != null &&
    levels.duringVoice < levels.before - 0.5 &&
    levels.afterVoice > levels.duringVoice + 0.3;

  const sfxOk =
    levels.sfx1 != null &&
    levels.sfx2 != null &&
    levels.before != null &&
    levels.sfx1 > levels.before - 1 &&
    levels.sfx2 > (levels.afterVoice ?? -99);

  const result = {
    status: mixDur >= 9.5 && mux.ok && duckingOk && sfxOk ? "completed" : "partial",
    mixer: "S2E-P1 mixStudioAudioLayers (voice-pad + duration=longest fix)",
    providerCallsDuringMix: 0,
    timelineHash,
    mixDurationSeconds: mixDur,
    mp4DurationSeconds: mp4Dur,
    levelsDb: levels,
    duckingOk,
    sfxOk,
    duckDeltaDb:
      levels.before != null && levels.duringVoice != null
        ? Number((levels.duringVoice - levels.before).toFixed(2))
        : null,
    finalMp4: "docs/audits/full-studio-cert/audio-final/final-export.mp4",
    note:
      "Local execution of Production mixer module. Deploy required for Production binary parity.",
  };

  console.log(JSON.stringify(result, null, 2));

  if (existsSync(LIVE)) {
    const report = JSON.parse(readFileSync(LIVE, "utf8"));
    report.scenarioD = { ...report.scenarioD, ...result, remixedAt: new Date().toISOString() };
    report.updatedAt = new Date().toISOString();
    writeFileSync(LIVE, JSON.stringify(report, null, 2));
  }
  writeFileSync(join(OUT, "SCENARIO-D-REMIX.json"), JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
