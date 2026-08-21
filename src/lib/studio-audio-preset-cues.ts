/**
 * S2E — Convert preset / director audio hints into timed cues (deterministic).
 * No provider calls. Asset vs cue: one asset → many cues.
 */

import type {
  StudioAmbienceCue,
  StudioSfxCue,
  StudioVisualSceneSpan,
} from "@/types/studio-audio-timeline";

const DISCRETE_SFX = new Set([
  "camera_flash",
  "camera flashes",
  "flash",
  "door_bell",
  "doorbell",
  "door_slam",
  "whoosh",
  "product_impact",
  "sting",
  "end_sting",
  "glass_clink",
  "chop",
  "sizzle",
  "plate",
  "box_placed",
]);

const AMBIENCE = new Set([
  "crowd",
  "crowd_ambience",
  "restaurant",
  "kitchen",
  "kitchen_ambience",
  "street",
  "wind",
  "room_tone",
  "ambience",
]);

export function classifyAudioHintToken(raw: string): "SFX_DISCRETE" | "AMBIENCE" | "UNKNOWN" {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (DISCRETE_SFX.has(t) || DISCRETE_SFX.has(raw.trim().toLowerCase())) {
    return "SFX_DISCRETE";
  }
  if (AMBIENCE.has(t) || t.includes("ambience") || t.includes("crowd")) {
    return "AMBIENCE";
  }
  if (t.includes("flash") || t.includes("whoosh") || t.includes("impact") || t.includes("sting")) {
    return "SFX_DISCRETE";
  }
  return "UNKNOWN";
}

/**
 * Deterministic flash/hit placement inside a scene (no randomness).
 * 2–3 events at fixed fractions of scene duration.
 */
export function deterministicDiscreteOffsetsMs(
  sceneDurationMs: number,
  cueType: string,
  count = 3
): number[] {
  const dur = Math.max(1000, sceneDurationMs);
  const type = cueType.toLowerCase();
  if (type.includes("flash")) {
    const fractions = [0.22, 0.56, 0.8].slice(0, Math.min(3, count));
    return fractions.map((f) => Math.round(dur * f));
  }
  if (type.includes("door") || type.includes("bell")) {
    return [Math.round(dur * 0.08)];
  }
  if (type.includes("impact") || type.includes("sting") || type.includes("whoosh")) {
    return [Math.round(dur * 0.35)];
  }
  if (type.includes("chop") || type.includes("sizzle") || type.includes("plate")) {
    return [Math.round(dur * 0.4), Math.round(dur * 0.7)].slice(0, count);
  }
  return [Math.round(dur * 0.5)];
}

export function resolvePresetSfxAndAmbienceCues(input: {
  projectId: string;
  sceneSpans: StudioVisualSceneSpan[];
  sfxSuggestions: string[];
  soundNotes?: string | null;
  soundAssetId?: string | null;
  soundAssetUrl?: string | null;
  defaultVolume?: number;
}): { sfx: StudioSfxCue[]; ambience: StudioAmbienceCue[]; unresolved: string[] } {
  const tokens = [
    ...input.sfxSuggestions,
    ...(input.soundNotes ?? "")
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  const sfx: StudioSfxCue[] = [];
  const ambience: StudioAmbienceCue[] = [];
  const unresolved: string[] = [];
  const vol = input.defaultVolume ?? 0.5;
  const primaryScene = input.sceneSpans[0] ?? null;
  const allSpanStart = input.sceneSpans[0]?.startMs ?? 0;
  const allSpanEnd =
    input.sceneSpans.length > 0
      ? input.sceneSpans[input.sceneSpans.length - 1]!.endMs
      : 5000;

  let cueSeq = 0;
  for (const token of unique) {
    const kind = classifyAudioHintToken(token);
    const cueType = token.trim().toLowerCase().replace(/\s+/g, "_");

    if (kind === "AMBIENCE") {
      ambience.push({
        id: `amb_${++cueSeq}`,
        kind: "AMBIENCE_CUE",
        sceneId: null,
        startMs: allSpanStart,
        endMs: allSpanEnd,
        durationMs: allSpanEnd - allSpanStart,
        volume: Math.min(vol, 0.25),
        assetId: input.soundAssetId ?? null,
        assetPointer: input.soundAssetUrl ?? null,
        source: "preset_hint",
        cueType,
        discrete: false,
      });
      continue;
    }

    if (kind === "SFX_DISCRETE") {
      if (!primaryScene) {
        unresolved.push(token);
        continue;
      }
      const offsets = deterministicDiscreteOffsetsMs(primaryScene.visualDurationMs, cueType);
      for (const offsetMs of offsets) {
        const startMs = primaryScene.startMs + offsetMs;
        const durationMs = cueType.includes("flash") ? 350 : 800;
        sfx.push({
          id: `sfx_${++cueSeq}`,
          kind: "SFX_CUE",
          sceneId: primaryScene.sceneId,
          startMs,
          endMs: startMs + durationMs,
          durationMs,
          volume: vol,
          assetId: input.soundAssetId ?? null,
          assetPointer: input.soundAssetUrl ?? null,
          source: "preset_hint",
          cueType,
          discrete: true,
        });
      }
      continue;
    }

    unresolved.push(token);
  }

  return { sfx, ambience, unresolved };
}
