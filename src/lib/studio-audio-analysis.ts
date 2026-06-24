/**
 * Audio analysis profile — duration, structure, energy (heuristic; no new engine).
 * Reuses upload duration estimation; segments derived from duration ratios.
 */

import { estimateUploadedAudioDurationSeconds } from "@/lib/studio-audio-upload-validation";
import type { AudioAnalysisProfile } from "@/types/studio-video-production";

const SECTION_RATIOS: Array<{
  id: string;
  label: string;
  startRatio: number;
  endRatio: number;
  energy: AudioAnalysisProfile["sections"][number]["energy"];
}> = [
  { id: "intro", label: "Intro", startRatio: 0, endRatio: 0.08, energy: "low" },
  { id: "verse_1", label: "Verse 1", startRatio: 0.08, endRatio: 0.25, energy: "medium" },
  { id: "chorus_1", label: "Chorus 1", startRatio: 0.25, endRatio: 0.38, energy: "peak" },
  { id: "verse_2", label: "Verse 2", startRatio: 0.38, endRatio: 0.52, energy: "medium" },
  { id: "chorus_2", label: "Chorus 2", startRatio: 0.52, endRatio: 0.68, energy: "peak" },
  { id: "bridge", label: "Bridge", startRatio: 0.68, endRatio: 0.82, energy: "low" },
  { id: "finale", label: "Finale", startRatio: 0.82, endRatio: 1, energy: "high" },
];

function estimateTempoFromDuration(durationSeconds: number): number {
  if (durationSeconds < 60) return 128;
  if (durationSeconds < 180) return 120;
  if (durationSeconds < 300) return 110;
  return 100;
}

function energyProfileFromDuration(durationSeconds: number): AudioAnalysisProfile["energyProfile"] {
  if (durationSeconds < 45) return "high";
  if (durationSeconds < 120) return "medium";
  if (durationSeconds < 240) return "dynamic";
  return "low";
}

export function analyzeAudioBuffer(params: {
  buffer: Buffer | Uint8Array;
  extension: string;
}): AudioAnalysisProfile {
  const buf = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);
  const durationSeconds = Math.round(
    estimateUploadedAudioDurationSeconds(buf, params.extension)
  );
  const tempoBpm = estimateTempoFromDuration(durationSeconds);

  const sections = SECTION_RATIOS.map((row) => ({
    id: row.id,
    label: row.label,
    startSeconds: Math.floor(durationSeconds * row.startRatio),
    endSeconds: Math.floor(durationSeconds * row.endRatio),
    energy: row.energy,
  }));

  const chorusMoments = sections
    .filter((s) => s.id.includes("chorus"))
    .map((s) => ({ startSeconds: s.startSeconds, endSeconds: s.endSeconds }));

  const dropMoments = chorusMoments.map((c) => ({
    seconds: c.startSeconds + Math.floor((c.endSeconds - c.startSeconds) * 0.15),
  }));

  const peakMoments = sections
    .filter((s) => s.energy === "peak" || s.energy === "high")
    .map((s) => ({
      seconds: s.startSeconds + Math.floor((s.endSeconds - s.startSeconds) / 2),
      intensity: s.energy === "peak" ? 0.95 : 0.75,
    }));

  const silenceRegions: AudioAnalysisProfile["silenceRegions"] = [];
  if (durationSeconds > 30) {
    silenceRegions.push({ startSeconds: 0, endSeconds: Math.min(2, Math.floor(durationSeconds * 0.02)) });
  }

  return {
    durationSeconds,
    tempoBpm,
    energyProfile: energyProfileFromDuration(durationSeconds),
    sections,
    silenceRegions,
    peakMoments,
    chorusMoments,
    dropMoments,
    analyzedAt: new Date().toISOString(),
    sourceFormat: params.extension,
  };
}
