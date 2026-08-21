/**
 * S2E — Preset/lifecycle audio hint coverage (registry-driven, not 162 manual rows).
 */

import { buildPresetLifecycleCoverageMatrix } from "@/lib/studio-preset-lifecycle";
import { classifyAudioHintToken } from "@/lib/studio-audio-preset-cues";
import type { StudioPresetLifecycleClass } from "@/types/studio-preset-production-context";

export type PresetAudioHintKind =
  | "NONE"
  | "VOICE"
  | "MUSIC_MOOD"
  | "MUSIC_ASSET"
  | "SFX_DISCRETE"
  | "AMBIENCE"
  | "SUBTITLE"
  | "TRANSLATION";

export type PresetAudioCoverageRow = {
  id: string;
  lifecycle: StudioPresetLifecycleClass;
  voiceHint: boolean;
  musicHint: boolean;
  sfxHint: boolean;
  ambienceHint: boolean;
  timelineReady: boolean;
  mixReady: boolean;
  status: "TIMELINE_READY" | "HINTS_ONLY" | "NONE" | "BLOCKED";
  nextGap: string | null;
};

function familyHints(row: {
  id: string;
  lifecycleClass: StudioPresetLifecycleClass;
  family: string;
}): {
  voiceHint: boolean;
  musicHint: boolean;
  sfxHint: boolean;
  ambienceHint: boolean;
} {
  const id = row.id.toLowerCase();
  const family = row.family.toLowerCase();
  const isRedCarpet = id.includes("red_carpet") || id.includes("people_red_carpet");
  const isCommercial =
    id.includes("business_product") ||
    id.includes("business_commercial") ||
    id.includes("product_launch");
  const isCooking =
    id.includes("cooking") || id.includes("restaurant") || id.includes("homecheff");
  const isStory =
    row.lifecycleClass === "ADVANCED_STORY" || row.lifecycleClass === "CANONICAL_MULTI_SCENE";

  if (row.lifecycleClass === "BLOCKED") {
    return { voiceHint: false, musicHint: false, sfxHint: false, ambienceHint: false };
  }

  return {
    voiceHint: isStory || isCommercial,
    musicHint: isRedCarpet || isCommercial || isCooking || isStory || family === "people",
    sfxHint: isRedCarpet || isCommercial || isCooking,
    ambienceHint: isRedCarpet || isCooking,
  };
}

export function buildPresetAudioCoverageMatrix(): PresetAudioCoverageRow[] {
  return buildPresetLifecycleCoverageMatrix().map((row) => {
    const hints = familyHints(row);
    const timelineReady =
      row.lifecycleClass !== "QUICK_ONE_SHOT" &&
      row.lifecycleClass !== "BLOCKED" &&
      (hints.musicHint || hints.sfxHint || hints.ambienceHint || hints.voiceHint);
    const mixReady = timelineReady && row.lifecycleClass !== "MOTION_ONLY";
    let status: PresetAudioCoverageRow["status"] = "NONE";
    if (row.lifecycleClass === "BLOCKED") status = "BLOCKED";
    else if (timelineReady) status = "TIMELINE_READY";
    else if (hints.musicHint || hints.sfxHint) status = "HINTS_ONLY";

    return {
      id: row.id,
      lifecycle: row.lifecycleClass,
      ...hints,
      timelineReady,
      mixReady,
      status,
      nextGap:
        row.lifecycleClass === "MOTION_ONLY"
          ? "lightweight_context_only"
          : !hints.sfxHint && !hints.musicHint
            ? null
            : null,
    };
  });
}

export function summarizePresetAudioCoverage(rows = buildPresetAudioCoverageMatrix()) {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }
  return { total: rows.length, byStatus };
}

export function classifyPresetAudioTokens(tokens: string[]): PresetAudioHintKind[] {
  const kinds = new Set<PresetAudioHintKind>();
  for (const t of tokens) {
    const c = classifyAudioHintToken(t);
    if (c === "SFX_DISCRETE") kinds.add("SFX_DISCRETE");
    if (c === "AMBIENCE") kinds.add("AMBIENCE");
  }
  return [...kinds];
}
