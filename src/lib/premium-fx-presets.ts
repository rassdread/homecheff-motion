export type FxPresetId =
  | "none"
  | "glow"
  | "sparks"
  | "dust"
  | "steam"
  | "comic_lines"
  | "social_energy"
  | "luxury_glow";

export const FX_PRESET_IDS: readonly FxPresetId[] = [
  "none",
  "glow",
  "sparks",
  "dust",
  "steam",
  "comic_lines",
  "social_energy",
  "luxury_glow",
] as const;

export const DEFAULT_FX_PRESET: FxPresetId = "social_energy";

export type FxPresetConfig = {
  id: FxPresetId;
  labelKey: string;
  promptHint: string;
  /** Lightweight FFmpeg eq suffix for optional minimal polish pass. */
  ffmpegEq?: string;
};

export const FX_PRESETS: Record<FxPresetId, FxPresetConfig> = {
  none: { id: "none", labelKey: "instant.fx.none", promptHint: "" },
  glow: {
    id: "glow",
    labelKey: "instant.fx.glow",
    promptHint: "Subtle rim glow and soft highlight on foreground only; never wash out text or logos.",
    ffmpegEq: "eq=brightness=0.02:saturation=1.05",
  },
  sparks: {
    id: "sparks",
    labelKey: "instant.fx.sparks",
    promptHint: "Tiny spark accents around hero subject; keep typography crisp and untouched.",
    ffmpegEq: "eq=brightness=0.03:contrast=1.02",
  },
  dust: {
    id: "dust",
    labelKey: "instant.fx.dust",
    promptHint: "Fine atmospheric dust motes in background depth; subject stays clean.",
    ffmpegEq: "eq=gamma=1.02:saturation=1.04",
  },
  steam: {
    id: "steam",
    labelKey: "instant.fx.steam",
    promptHint: "Soft steam or heat haze for food scenes; preserve readable text zones.",
    ffmpegEq: "eq=brightness=0.02:saturation=1.06",
  },
  comic_lines: {
    id: "comic_lines",
    labelKey: "instant.fx.comicLines",
    promptHint: "Light manga speed-line energy on motion beats only; speech bubbles stay static.",
    ffmpegEq: "eq=contrast=1.03:saturation=1.05",
  },
  social_energy: {
    id: "social_energy",
    labelKey: "instant.fx.socialEnergy",
    promptHint: "Premium social energy: soft glow + micro contrast on foreground; UI/text frozen.",
    ffmpegEq: "eq=brightness=0.025:saturation=1.07",
  },
  luxury_glow: {
    id: "luxury_glow",
    labelKey: "instant.fx.luxuryGlow",
    promptHint: "Luxury soft glow and warm lift on hero subject; elegant, not neon.",
    ffmpegEq: "eq=brightness=0.02:saturation=1.08:gamma=1.02",
  },
};

export function normalizeFxPresetId(value: unknown): FxPresetId {
  if (typeof value === "string") {
    const v = value.trim() as FxPresetId;
    if (FX_PRESET_IDS.includes(v)) {
      return v;
    }
  }
  return DEFAULT_FX_PRESET;
}

export function buildFxPromptBlock(presetId: FxPresetId): string {
  const preset = FX_PRESETS[presetId] ?? FX_PRESETS.none;
  if (!preset.promptHint) {
    return "";
  }
  return `SCENE FX (${preset.id}): ${preset.promptHint}`;
}
