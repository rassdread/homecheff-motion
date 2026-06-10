import { QUICK_MOTION_ANIMATION_MAP } from "@/lib/editor-quick-gif";
import type { EditorObjectAnimationProfile } from "@/types/homecheff-visual-editor";
import type {
  EditorCanvasDocument,
  EditorQuickMotionPreset,
  EditorV6MotionPreviewPreset,
} from "@/types/homecheff-visual-editor";

function toQuickMotionPreset(preset: EditorV6MotionPreviewPreset): EditorQuickMotionPreset {
  if (preset === "wave") {
    return "wiggle";
  }
  return preset;
}

const V6_TO_ANIMATION: Record<EditorV6MotionPreviewPreset, EditorObjectAnimationProfile> = {
  float: "float",
  rotate: "rotate",
  pulse: "pulse",
  bounce: "bounce",
  orbit: "orbit",
  reveal: "float",
  wave: "wave",
};

export function motionPreviewProfileForPreset(
  preset: EditorV6MotionPreviewPreset
): EditorObjectAnimationProfile {
  return V6_TO_ANIMATION[preset];
}

export function attachMotionPreview(
  document: EditorCanvasDocument,
  layerId: string,
  preset: EditorV6MotionPreviewPreset
): EditorCanvasDocument {
  return {
    ...document,
    productivityState: {
      ...document.productivityState,
      motionPreviewPreset: preset,
      motionPreviewLayerId: layerId,
    },
    quickMotionConfig: {
      preset: toQuickMotionPreset(preset),
      format: "gif",
      durationSec: 2,
      loop: true,
      fps: 12,
      width: 512,
      height: 512,
      transparentBackground: true,
      quality: 0.85,
      targetLayerId: layerId,
      ...document.quickMotionConfig,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function clearMotionPreview(document: EditorCanvasDocument): EditorCanvasDocument {
  const rest = { ...document.productivityState };
  delete rest.motionPreviewPreset;
  delete rest.motionPreviewLayerId;
  return {
    ...document,
    productivityState: rest && Object.keys(rest).length ? rest : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function isMotionPreviewActive(
  document: EditorCanvasDocument,
  layerId: string
): boolean {
  return (
    document.productivityState?.motionPreviewLayerId === layerId &&
    Boolean(document.productivityState?.motionPreviewPreset)
  );
}

export function animationProfileFromV6Preset(preset: EditorV6MotionPreviewPreset): EditorObjectAnimationProfile {
  const mapped = QUICK_MOTION_ANIMATION_MAP[toQuickMotionPreset(preset)];
  return mapped ?? motionPreviewProfileForPreset(preset);
}
