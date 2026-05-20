import { FX_PRESETS, type FxPresetId } from "@/lib/premium-fx-presets";

/**
 * Phase 6 — minimal polish only. Never overlays static posters or suppresses Vidu motion.
 */

export type MinimalCompositorInput = {
  enabled: boolean;
  fxPreset: FxPresetId;
};

export function buildFxFfmpegEq(fxPreset: FxPresetId): string | null {
  return FX_PRESETS[fxPreset]?.ffmpegEq ?? null;
}

export function buildMinimalPolishVideoFilter(input: MinimalCompositorInput): string | null {
  if (!input.enabled) {
    return null;
  }
  const eq = buildFxFfmpegEq(input.fxPreset);
  if (!eq) {
    return "format=yuv420p";
  }
  return `${eq},format=yuv420p`;
}

export function shouldApplyMinimalCompositorPolish(
  enabled: boolean | undefined,
  fxPreset: FxPresetId
): boolean {
  if (!enabled) {
    return false;
  }
  return Boolean(buildMinimalPolishVideoFilter({ enabled: true, fxPreset }));
}
