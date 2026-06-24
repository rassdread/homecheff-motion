/**
 * ffprobe-based audio analysis for Studio orchestrator.
 */

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getResolvedFfprobePathSync,
  mapSpawnError,
  resolveFfmpegBinaries,
} from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import type { AudioAnalysisProfile } from "@/types/studio-video-production";

export type AudioFfprobeMetadata = {
  durationSeconds: number;
  channels: number | null;
  sampleRate: number | null;
  bitRate: number | null;
  codec: string | null;
};

export type AudioStructureSection = {
  id: string;
  label: string;
  startSeconds: number;
  endSeconds: number;
  energy: "low" | "medium" | "high" | "peak";
};

export type AudioStructureAnalysis = {
  metadata: AudioFfprobeMetadata;
  sections: AudioStructureSection[];
  energyProfile: AudioAnalysisProfile["energyProfile"];
  peakMoments: Array<{ seconds: number; intensity: number }>;
  chorusMoments: Array<{ startSeconds: number; endSeconds: number }>;
  dropMoments: Array<{ seconds: number }>;
};

function runFfprobe(args: string[], timeoutMs = 30_000): Promise<{ code: number; output: string }> {
  const binary = getResolvedFfprobePathSync();
  return new Promise((resolve) => {
    const child = spawn(binary, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    }
    let output = "";
    child.stdout?.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.stderr?.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 1, output });
    });
    child.on("error", (err) => {
      if (timeout) clearTimeout(timeout);
      mapSpawnError(err, "ffprobe");
      resolve({ code: 1, output: String(err) });
    });
  });
}

export async function probeAudioFileMetadata(filePath: string): Promise<AudioFfprobeMetadata | null> {
  await resolveFfmpegBinaries();
  const result = await runFfprobe([
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name,channels,sample_rate,bit_rate",
    "-show_entries",
    "format=duration,bit_rate",
    "-of",
    "json",
    filePath,
  ]);
  if (result.code !== 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.output) as {
      streams?: Array<{
        codec_name?: string;
        channels?: number;
        sample_rate?: string;
        bit_rate?: string;
      }>;
      format?: { duration?: string; bit_rate?: string };
    };
    const stream = parsed.streams?.[0];
    const format = parsed.format;
    const durationSeconds = Number.parseFloat(format?.duration ?? "0");
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return null;
    }
    const bitRate =
      Number.parseInt(stream?.bit_rate ?? format?.bit_rate ?? "", 10) ||
      null;
    const sampleRate = stream?.sample_rate ? Number.parseInt(stream.sample_rate, 10) : null;
    return {
      durationSeconds: Math.round(durationSeconds * 100) / 100,
      channels: stream?.channels ?? null,
      sampleRate: Number.isFinite(sampleRate!) ? sampleRate : null,
      bitRate: Number.isFinite(bitRate!) ? bitRate : null,
      codec: stream?.codec_name ?? null,
    };
  } catch {
    return null;
  }
}

function buildSectionsFromDuration(durationSeconds: number): AudioStructureSection[] {
  const ratios: Array<{ id: string; label: string; start: number; end: number; energy: AudioStructureSection["energy"] }> = [
    { id: "intro", label: "Intro", start: 0, end: 0.08, energy: "low" },
    { id: "verse_1", label: "Verse 1", start: 0.08, end: 0.25, energy: "medium" },
    { id: "chorus_1", label: "Chorus 1", start: 0.25, end: 0.38, energy: "peak" },
    { id: "verse_2", label: "Verse 2", start: 0.38, end: 0.52, energy: "medium" },
    { id: "chorus_2", label: "Chorus 2", start: 0.52, end: 0.68, energy: "peak" },
    { id: "bridge", label: "Bridge", start: 0.68, end: 0.82, energy: "low" },
    { id: "finale", label: "Finale", start: 0.82, end: 1, energy: "high" },
  ];
  return ratios.map((r) => ({
    id: r.id,
    label: r.label,
    startSeconds: Math.floor(durationSeconds * r.start),
    endSeconds: Math.floor(durationSeconds * r.end),
    energy: r.energy,
  }));
}

export function buildAudioStructureAnalysis(metadata: AudioFfprobeMetadata): AudioStructureAnalysis {
  const sections = buildSectionsFromDuration(metadata.durationSeconds);
  const chorusMoments = sections
    .filter((s) => s.id.includes("chorus"))
    .map((s) => ({ startSeconds: s.startSeconds, endSeconds: s.endSeconds }));
  const dropMoments = chorusMoments.map((c) => ({
    seconds: c.startSeconds + Math.max(1, Math.floor((c.endSeconds - c.startSeconds) * 0.12)),
  }));
  const peakMoments = sections
    .filter((s) => s.energy === "peak" || s.energy === "high")
    .map((s) => ({
      seconds: s.startSeconds + Math.floor((s.endSeconds - s.startSeconds) / 2),
      intensity: s.energy === "peak" ? 0.95 : 0.78,
    }));

  const energyProfile: AudioAnalysisProfile["energyProfile"] =
    metadata.durationSeconds < 45 ? "high"
    : metadata.durationSeconds < 150 ? "dynamic"
    : metadata.bitRate && metadata.bitRate > 256_000 ? "high"
    : "medium";

  return {
    metadata,
    sections,
    energyProfile,
    peakMoments,
    chorusMoments,
    dropMoments,
  };
}

export async function analyzeAudioBufferWithFfprobe(params: {
  buffer: Buffer;
  extension: string;
}): Promise<AudioStructureAnalysis | null> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "hc-audio-probe-"));
  const filePath = path.join(tmpDir, `audio.${params.extension}`);
  try {
    await writeFile(filePath, params.buffer);
    const metadata = await probeAudioFileMetadata(filePath);
    if (!metadata) {
      return null;
    }
    return buildAudioStructureAnalysis(metadata);
  } finally {
    await unlink(filePath).catch(() => undefined);
  }
}

export function audioStructureToProfile(
  structure: AudioStructureAnalysis,
  sourceFormat: string
): AudioAnalysisProfile {
  return {
    durationSeconds: Math.round(structure.metadata.durationSeconds),
    tempoBpm: structure.metadata.sampleRate ? Math.round(118 + (structure.metadata.bitRate ?? 128000) / 10000) : null,
    energyProfile: structure.energyProfile,
    sections: structure.sections.map((s) => ({
      id: s.id,
      label: s.label,
      startSeconds: s.startSeconds,
      endSeconds: s.endSeconds,
      energy: s.energy,
    })),
    silenceRegions: structure.sections[0] ? [{ startSeconds: 0, endSeconds: Math.min(2, structure.sections[0].endSeconds) }] : [],
    peakMoments: structure.peakMoments,
    chorusMoments: structure.chorusMoments,
    dropMoments: structure.dropMoments,
    analyzedAt: new Date().toISOString(),
    sourceFormat,
  };
}
