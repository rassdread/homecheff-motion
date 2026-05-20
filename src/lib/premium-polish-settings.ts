import { identityCharacterMotion } from "@/lib/animation-style-identity";
import {
  getAnimationStyle,
  normalizeAnimationStyleId,
  resolveAnimationStyleIdFromSettings,
  type AnimationStyleId,
} from "@/lib/animation-style-presets";
import type { SceneIntelligenceSnapshot } from "@/lib/scene-intelligence";
import {
  getPremiumPolishPreset,
  normalizePremiumPolishPresetId,
  type PremiumPolishPresetId,
} from "@/lib/premium-polish-presets";
import { normalizeCameraPresetId, type CameraPresetId } from "@/lib/premium-camera-presets";
import { normalizeFxPresetId, type FxPresetId } from "@/lib/premium-fx-presets";
import { normalizeComicStoryPresetId, type ComicStoryPresetId } from "@/lib/premium-comic-presets";
import {
  parseManualForegroundRegions,
  resolveSegmentationProvider,
  type ManualForegroundRegion,
  type SegmentationProvider,
} from "@/lib/premium-foreground-segmentation";
import {
  normalizeEmotionalActingPresetId,
  type EmotionalActingPresetId,
} from "@/lib/premium-emotional-presets";
import { normalizeMotionEnergy, type MotionEnergy } from "@/lib/premium-motion-engine";
import {
  normalizeSegmentTransitionType,
  type SegmentTransitionType,
} from "@/lib/segment-transition-types";
import {
  FINAL_ASSEMBLY_MODES,
  type FinalAssemblyMode,
} from "@/lib/final-assembly-types";

/** Stored in instantPosterMotionSettings JSON alongside poster toggles. */
export type PremiumPolishSettings = {
  version: 1;
  animationStyleId?: AnimationStyleId;
  sceneIntelligence?: SceneIntelligenceSnapshot;
  premiumPresetId?: PremiumPolishPresetId;
  motionEnergy?: MotionEnergy;
  segmentTransitionType?: SegmentTransitionType;
  assemblyMode?: FinalAssemblyMode;
  cameraPreset?: CameraPresetId;
  fxPreset?: FxPresetId;
  comicPreset?: ComicStoryPresetId;
  segmentationProvider?: SegmentationProvider;
  textPreservation?: boolean;
  minimalCompositorPolish?: boolean;
  manualForegroundRegions?: ManualForegroundRegion[];
  emotionalActingPreset?: EmotionalActingPresetId;
  characterMotion?: {
    emotion?: string;
    energy?: string;
    personality?: string;
    motionStyle?: string;
  };
};

export type ResolvedPremiumPolishProfile = {
  animationStyleId: AnimationStyleId;
  premiumPresetId: PremiumPolishPresetId;
  motionEnergy: MotionEnergy;
  segmentTransitionType: SegmentTransitionType;
  assemblyMode: FinalAssemblyMode;
  cameraPreset: CameraPresetId;
  fxPreset: FxPresetId;
  comicPreset: ComicStoryPresetId;
  segmentationProvider: SegmentationProvider;
  textPreservation: boolean;
  minimalCompositorPolish: boolean;
  manualForegroundRegions: ManualForegroundRegion[];
  emotionalActingPreset?: EmotionalActingPresetId;
  characterMotion?: PremiumPolishSettings["characterMotion"];
};

export function parsePremiumPolishSettings(raw: unknown): PremiumPolishSettings {
  if (!raw || typeof raw !== "object") {
    return { version: 1 };
  }
  const o = raw as Record<string, unknown>;
  return {
    version: 1,
    animationStyleId:
      typeof o.animationStyleId === "string"
        ? normalizeAnimationStyleId(o.animationStyleId)
        : undefined,
    sceneIntelligence:
      o.sceneIntelligence && typeof o.sceneIntelligence === "object"
        ? (o.sceneIntelligence as SceneIntelligenceSnapshot)
        : undefined,
    premiumPresetId:
      typeof o.premiumPresetId === "string"
        ? normalizePremiumPolishPresetId(o.premiumPresetId)
        : undefined,
    motionEnergy:
      typeof o.motionEnergy === "string" ? normalizeMotionEnergy(o.motionEnergy) : undefined,
    segmentTransitionType:
      typeof o.segmentTransitionType === "string"
        ? normalizeSegmentTransitionType(o.segmentTransitionType)
        : undefined,
    assemblyMode:
      typeof o.assemblyMode === "string" &&
      FINAL_ASSEMBLY_MODES.includes(o.assemblyMode as FinalAssemblyMode)
        ? (o.assemblyMode as FinalAssemblyMode)
        : undefined,
    cameraPreset:
      typeof o.cameraPreset === "string" ? normalizeCameraPresetId(o.cameraPreset) : undefined,
    fxPreset: typeof o.fxPreset === "string" ? normalizeFxPresetId(o.fxPreset) : undefined,
    comicPreset:
      typeof o.comicPreset === "string" ? normalizeComicStoryPresetId(o.comicPreset) : undefined,
    segmentationProvider:
      typeof o.segmentationProvider === "string"
        ? resolveSegmentationProvider(o.segmentationProvider as SegmentationProvider)
        : undefined,
    textPreservation: typeof o.textPreservation === "boolean" ? o.textPreservation : undefined,
    minimalCompositorPolish:
      typeof o.minimalCompositorPolish === "boolean" ? o.minimalCompositorPolish : undefined,
    manualForegroundRegions: parseManualForegroundRegions(o.manualForegroundRegions),
    emotionalActingPreset: normalizeEmotionalActingPresetId(o.emotionalActingPreset),
    characterMotion:
      o.characterMotion && typeof o.characterMotion === "object"
        ? (o.characterMotion as PremiumPolishSettings["characterMotion"])
        : undefined,
  };
}

export function resolvePremiumPolishProfile(raw: unknown): ResolvedPremiumPolishProfile {
  const parsed = parsePremiumPolishSettings(raw);
  const animationStyleId =
    parsed.animationStyleId ??
    resolveAnimationStyleIdFromSettings(parsed);
  const style = getAnimationStyle(animationStyleId);
  const preset = getPremiumPolishPreset(
    parsed.premiumPresetId ?? style.legacyPremiumPresetId
  );
  const scene = parsed.sceneIntelligence;
  const emotionalFromScene =
    scene?.resolvedEmotionalPreset &&
    style.emotionalActingPreset === "auto_detect"
      ? scene.resolvedEmotionalPreset
      : undefined;
  const emotionalFromStyle =
    style.emotionalActingPreset !== "auto_detect"
      ? style.emotionalActingPreset
      : undefined;

  return {
    animationStyleId: style.id,
    premiumPresetId: preset.id,
    motionEnergy: parsed.motionEnergy ?? style.motionEnergy ?? preset.motionEnergy,
    segmentTransitionType:
      parsed.segmentTransitionType ?? style.segmentTransitionType ?? preset.transitionType,
    assemblyMode: parsed.assemblyMode ?? style.assemblyMode ?? preset.assemblyMode,
    cameraPreset: parsed.cameraPreset ?? style.cameraPreset ?? preset.cameraPreset,
    fxPreset: parsed.fxPreset ?? style.fxPreset ?? preset.fxPreset,
    comicPreset: parsed.comicPreset ?? style.comicPreset ?? preset.comicPreset ?? "none",
    segmentationProvider: resolveSegmentationProvider(
      parsed.segmentationProvider ?? style.segmentationProvider ?? preset.segmentationProvider
    ),
    textPreservation: parsed.textPreservation ?? style.textPreservation ?? preset.textPreservation,
    minimalCompositorPolish:
      parsed.minimalCompositorPolish ??
      style.minimalCompositorPolish ??
      preset.minimalCompositorPolish,
    manualForegroundRegions: parsed.manualForegroundRegions ?? [],
    emotionalActingPreset:
      parsed.emotionalActingPreset ?? emotionalFromScene ?? emotionalFromStyle,
    characterMotion:
      parsed.characterMotion ??
      identityCharacterMotion(style.id) ??
      preset.characterMotion,
  };
}

export function mergePremiumPolishIntoPosterSettings(
  posterSettings: Record<string, unknown>,
  polish: Partial<PremiumPolishSettings>
): Record<string, unknown> {
  return { ...posterSettings, ...polish, version: 1 };
}
