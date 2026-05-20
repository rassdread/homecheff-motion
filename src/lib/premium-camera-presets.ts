export type CameraPresetId =
  | "none"
  | "calm_drift"
  | "dramatic_reveal"
  | "punch_in"
  | "parallax"
  | "comic_zoom";

export const CAMERA_PRESET_IDS: readonly CameraPresetId[] = [
  "none",
  "calm_drift",
  "dramatic_reveal",
  "punch_in",
  "parallax",
  "comic_zoom",
] as const;

export const DEFAULT_CAMERA_PRESET: CameraPresetId = "calm_drift";

export type CameraPresetConfig = {
  id: CameraPresetId;
  labelKey: string;
  /** Vidu / generation hint — subtle only, no shake. */
  promptHint: string;
  /** FFmpeg zoompan scale when compositor path used (very subtle). */
  zoomRate?: number;
};

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPresetConfig> = {
  none: {
    id: "none",
    labelKey: "instant.camera.none",
    promptHint: "Keep camera framing stable with only subject motion.",
  },
  calm_drift: {
    id: "calm_drift",
    labelKey: "instant.camera.calmDrift",
    promptHint:
      "Apply a very subtle cinematic drift — slow push or float, no shake, no jitter, no aggressive zoom.",
    zoomRate: 0.00025,
  },
  dramatic_reveal: {
    id: "dramatic_reveal",
    labelKey: "instant.camera.dramaticReveal",
    promptHint:
      "Slow dramatic reveal: gentle scale-in with soft easing, premium ad pacing, no snap zoom.",
    zoomRate: 0.00032,
  },
  punch_in: {
    id: "punch_in",
    labelKey: "instant.camera.punchIn",
    promptHint:
      "Subtle punch-in emphasis on hero subject mid-clip — short, controlled, social-ad style, never shaky.",
    zoomRate: 0.0004,
  },
  parallax: {
    id: "parallax",
    labelKey: "instant.camera.parallax",
    promptHint:
      "Create parallax illusion: foreground moves slightly faster than background, layered depth, no camera shake.",
    zoomRate: 0.00028,
  },
  comic_zoom: {
    id: "comic_zoom",
    labelKey: "instant.camera.comicZoom",
    promptHint:
      "Comic-style impact zoom — brief controlled scale pulse on key beat, manga poster energy without blur smear.",
    zoomRate: 0.00045,
  },
};

export function normalizeCameraPresetId(value: unknown): CameraPresetId {
  if (typeof value === "string") {
    const v = value.trim() as CameraPresetId;
    if (CAMERA_PRESET_IDS.includes(v)) {
      return v;
    }
  }
  return DEFAULT_CAMERA_PRESET;
}

export function buildCameraPromptBlock(presetId: CameraPresetId): string {
  const preset = CAMERA_PRESETS[presetId] ?? CAMERA_PRESETS.calm_drift;
  if (preset.id === "none") {
    return "";
  }
  return `CINEMATIC CAMERA (${preset.id}): ${preset.promptHint}`;
}
