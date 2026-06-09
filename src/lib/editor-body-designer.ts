import { buildBodyDesignerPromptBlock } from "@/lib/homecheff-visual-editor-foundation";
import type { CharacterConstructionProfile } from "@/types/studio-asset-animation-readiness";
import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import {
  CHARACTER_BODY_STYLIZATION_PRESETS,
  DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
  type CharacterBodyDesignerParams,
  type CharacterBodyStylizationPreset,
  type EditorCanvasDocument,
  type EditorCanvasLayer,
} from "@/types/homecheff-visual-editor";

export type BodyDesignerSliderKey = Exclude<
  keyof CharacterBodyDesignerParams,
  "stylizationPreset" | "stylizationCustom"
>;

export type BodyDesignerRange = { min: number; max: number; step: number };

export type BodyDesignerPresetDefinition = {
  preset: CharacterBodyStylizationPreset;
  values: CharacterBodyDesignerParams;
};

const PRESET_VALUES: Record<CharacterBodyStylizationPreset, CharacterBodyDesignerParams> = {
  realistic: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "realistic",
    headScale: 1,
    eyeScale: 1,
    shoulderWidth: 1,
    armThickness: 1,
    waistWidth: 1,
    legLength: 1,
    handSize: 1,
    footSize: 1,
    height: 1,
  },
  stylized: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "stylized",
    headScale: 1.05,
    eyeScale: 1.08,
    shoulderWidth: 1.02,
    armThickness: 1,
    waistWidth: 0.98,
    legLength: 1.03,
    handSize: 1,
    footSize: 1,
    height: 1.02,
  },
  mascot: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "mascot",
    headScale: 1.35,
    eyeScale: 1.25,
    shoulderWidth: 1.1,
    armThickness: 0.95,
    waistWidth: 1.05,
    legLength: 0.9,
    handSize: 1.1,
    footSize: 1.05,
    height: 0.95,
  },
  hero: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "hero",
    headScale: 1.08,
    eyeScale: 1.05,
    shoulderWidth: 1.18,
    armThickness: 1.12,
    waistWidth: 0.92,
    legLength: 1.08,
    handSize: 1.05,
    footSize: 1.04,
    height: 1.08,
  },
  cute: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "cute",
    headScale: 1.28,
    eyeScale: 1.3,
    shoulderWidth: 0.95,
    armThickness: 0.92,
    waistWidth: 1.02,
    legLength: 0.88,
    handSize: 1.08,
    footSize: 1.02,
    height: 0.9,
  },
  cartoon: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "cartoon",
    headScale: 1.22,
    eyeScale: 1.18,
    shoulderWidth: 1.05,
    armThickness: 0.98,
    waistWidth: 1,
    legLength: 0.94,
    handSize: 1.06,
    footSize: 1.04,
    height: 0.96,
  },
  custom: {
    ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
    stylizationPreset: "custom",
  },
};

export function resolveBodyDesignerPreset(preset: CharacterBodyStylizationPreset): CharacterBodyDesignerParams {
  return { ...PRESET_VALUES[preset] };
}

export function isRealisticHumanSubject(objectType?: AssetVisionObjectType | string): boolean {
  return objectType === "human";
}

export function isCreativeCharacterSubject(objectType?: AssetVisionObjectType | string): boolean {
  return objectType === "mascot" || objectType === "character" || objectType === "animal";
}

export function resolveBodyDesignerSliderRange(
  key: BodyDesignerSliderKey,
  objectType?: AssetVisionObjectType | string
): BodyDesignerRange {
  const subtle = isRealisticHumanSubject(objectType);
  const base = subtle
    ? { min: 0.92, max: 1.08, step: 0.01 }
    : { min: 0.7, max: 1.4, step: 0.02 };
  if (key === "height" || key === "legLength") {
    return subtle ? { min: 0.94, max: 1.06, step: 0.01 } : { min: 0.75, max: 1.25, step: 0.02 };
  }
  if (key === "headScale" || key === "eyeScale") {
    return subtle ? { min: 0.95, max: 1.05, step: 0.01 } : { min: 0.65, max: 1.45, step: 0.02 };
  }
  return base;
}

export function clampBodyDesignerParams(
  params: CharacterBodyDesignerParams,
  objectType?: AssetVisionObjectType | string
): CharacterBodyDesignerParams {
  const keys: BodyDesignerSliderKey[] = [
    "headScale",
    "eyeScale",
    "shoulderWidth",
    "armThickness",
    "waistWidth",
    "legLength",
    "handSize",
    "footSize",
    "height",
  ];
  const next = { ...params };
  for (const key of keys) {
    const { min, max } = resolveBodyDesignerSliderRange(key, objectType);
    next[key] = Math.min(max, Math.max(min, next[key]));
  }
  return next;
}

export function patchBodyDesignerParams(
  current: CharacterBodyDesignerParams | undefined,
  patch: Partial<CharacterBodyDesignerParams>,
  objectType?: AssetVisionObjectType | string
): CharacterBodyDesignerParams {
  return clampBodyDesignerParams({ ...(current ?? DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS), ...patch }, objectType);
}

export function bodyDesignerToCharacterConstructionProfile(
  params: CharacterBodyDesignerParams
): CharacterConstructionProfile {
  const bodyType =
    params.stylizationPreset === "custom" && params.stylizationCustom?.trim()
      ? params.stylizationCustom.trim()
      : params.stylizationPreset;
  return {
    bodyVisibility: "full_body",
    requiresConstruction: true,
    bodyType,
    heightProfile: params.height >= 1.05 ? "tall" : params.height <= 0.95 ? "compact" : "balanced",
    postureProfile: params.shoulderWidth >= 1.08 ? "confident" : "neutral",
    limbProportions: [
      `head ${Math.round(params.headScale * 100)}%`,
      `eyes ${Math.round(params.eyeScale * 100)}%`,
      `shoulders ${Math.round(params.shoulderWidth * 100)}%`,
      `arms ${Math.round(params.armThickness * 100)}%`,
      `waist ${Math.round(params.waistWidth * 100)}%`,
      `legs ${Math.round(params.legLength * 100)}%`,
      `hands ${Math.round(params.handSize * 100)}%`,
      `feet ${Math.round(params.footSize * 100)}%`,
      `height ${Math.round(params.height * 100)}%`,
    ].join(", "),
    preserveSilhouette: true,
    preserveHeadShape: true,
    preserveProportions: params.stylizationPreset === "realistic",
    scaleProfile: params.stylizationPreset,
    presentationAngle: "three_quarter",
    heroView: params.stylizationPreset === "hero",
  };
}

export function inferEditorObjectType(document: EditorCanvasDocument): AssetVisionObjectType | undefined {
  const root = document.semanticLayers?.find((l) => l.type === "character");
  if (root) {
    return document.sourceKind === "character" || document.sourceKind === "canonical" ? "mascot" : "character";
  }
  if (document.sourceKind === "upload") {
    return "human";
  }
  if (document.sourceKind === "character" || document.sourceKind === "canonical") {
    return "mascot";
  }
  return undefined;
}

export function documentSupportsBodyDesigner(document: EditorCanvasDocument): boolean {
  if (["product_photo", "logo"].includes(document.sourceKind)) {
    return false;
  }
  const objectType = inferEditorObjectType(document);
  return (
    isCreativeCharacterSubject(objectType) ||
    isRealisticHumanSubject(objectType) ||
    document.objects.some((l) => l.layerType === "semantic" && (l.category === "character" || l.category === "body"))
  );
}

export function buildBodyGuideOverlayLayers(
  params: CharacterBodyDesignerParams,
  layers: EditorCanvasLayer[]
): Array<{ id: string; label: string; bounds: { x: number; y: number; width: number; height: number }; locked: boolean }> {
  const head = layers.find((l) => l.semanticType === "head" || /head/i.test(l.label));
  const body = layers.find((l) => l.semanticType === "body" || l.category === "body");
  const headBounds = head?.bounds ?? { x: 0.32, y: 0.06, width: 0.36, height: 0.24 };
  const bodyBounds = body?.bounds ?? { x: 0.28, y: 0.28, width: 0.44, height: 0.48 };
  return [
    {
      id: "body_guide_head",
      label: "Head guide",
      bounds: {
        x: headBounds.x + (1 - params.headScale) * 0.05,
        y: headBounds.y,
        width: headBounds.width * params.headScale,
        height: headBounds.height * params.headScale,
      },
      locked: Boolean(head?.metadata?.identityRelevance === "identity_marker"),
    },
    {
      id: "body_guide_torso",
      label: "Body guide",
      bounds: {
        x: bodyBounds.x - (params.shoulderWidth - 1) * 0.05,
        y: bodyBounds.y + (1 - params.height) * 0.08,
        width: bodyBounds.width * params.shoulderWidth,
        height: bodyBounds.height * params.height * params.legLength,
      },
      locked: false,
    },
  ];
}

export function identityMarkerLayersLocked(layers: EditorCanvasLayer[]): boolean {
  return layers.some((l) => l.metadata?.identityRelevance === "identity_marker" && l.locked);
}

export function buildEditorBodyDesignerPromptBlock(document: EditorCanvasDocument): string {
  if (!document.bodyDesigner) {
    return "";
  }
  return buildBodyDesignerPromptBlock(document.bodyDesigner);
}

export function listBodyDesignerPresets(): CharacterBodyStylizationPreset[] {
  return [...CHARACTER_BODY_STYLIZATION_PRESETS];
}
