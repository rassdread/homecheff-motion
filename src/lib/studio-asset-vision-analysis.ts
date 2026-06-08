import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type {
  AssetReferenceVisionJson,
  AssetVisionAnalysis,
  AssetVisionColor,
  AssetVisionObjectType,
} from "@/types/studio-asset-vision-analysis";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  buildAssetSemanticGenerationContext,
  buildAssetSemanticGenerationInputFromDraft,
} from "@/lib/studio-asset-semantic-generation-context";
import {
  buildAutoForbiddenStyleRules,
  buildCharacterVariantChangeRules,
  buildCharacterVariantPreserveRules,
  buildIdentityFingerprintFromVision,
  applyKnownBrandDefaults,
  inferAssetFamily,
  inferBrandIdentityFromContext,
  normalizeCharacterLineage,
} from "@/lib/studio-asset-identity-preservation";

export type VisionTransformationRules = {
  preserve: string[];
  change: string[];
  forbidden: string[];
};

const CHARACTER_LIKE_TYPES: AssetVisionObjectType[] = [
  "character",
  "mascot",
  "human",
  "animal",
];

const CHARACTER_LIKE_RULES: VisionTransformationRules = {
  preserve: ["face", "colors", "brand identity", "shape language"],
  change: ["outfit", "role", "accessories", "environment"],
  forbidden: ["style break", "color break", "face change", "redesign from scratch"],
};

const TYPE_TRANSFORMATION_RULES: Partial<Record<AssetVisionObjectType, VisionTransformationRules>> = {
  packaging: {
    preserve: ["logo", "branding", "shape", "brand colors"],
    change: ["edition", "format", "context", "label copy"],
    forbidden: ["logo removal", "brand break", "color break", "shape redesign"],
  },
  logo: {
    preserve: ["symbol", "brand colors", "identity", "shape language"],
    change: ["presentation", "3D version", "dark variant", "background"],
    forbidden: ["symbol change", "color break", "identity break", "unrecognizable mark"],
  },
  brand_asset: {
    preserve: ["symbol", "brand colors", "identity"],
    change: ["presentation", "context", "variant treatment"],
    forbidden: ["brand break", "color break", "symbol change"],
  },
  location: {
    preserve: ["architecture", "layout", "spatial structure"],
    change: ["season", "time of day", "mood", "weather"],
    forbidden: ["layout break", "architecture change", "unrecognizable place"],
  },
  building: {
    preserve: ["architecture", "layout", "structural identity"],
    change: ["season", "time of day", "mood", "lighting"],
    forbidden: ["architecture change", "layout break"],
  },
  environment: {
    preserve: ["visual style", "genre rules", "color palette", "shape language"],
    change: ["season", "mood", "time of day", "story context"],
    forbidden: ["style break", "genre break", "palette break"],
  },
  product: {
    preserve: ["form", "materials", "branding", "brand colors"],
    change: ["context", "usage scene", "edition", "accessories"],
    forbidden: ["form break", "brand break", "unrecognizable product"],
  },
  food_item: {
    preserve: ["recognizable food form", "brand styling", "colors"],
    change: ["plating", "context", "props", "presentation"],
    forbidden: ["unrecognizable food", "brand break"],
  },
  vehicle: {
    preserve: ["silhouette", "branding", "brand colors"],
    change: ["context", "environment", "livery variant"],
    forbidden: ["silhouette break", "brand break"],
  },
  tool: {
    preserve: ["form", "materials", "branding"],
    change: ["context", "usage", "environment"],
    forbidden: ["form break", "unrecognizable object"],
  },
  illustration: {
    preserve: ["style", "line language", "brand colors", "composition logic"],
    change: ["subject context", "scene", "variant theme"],
    forbidden: ["style break", "off-brand palette"],
  },
  ui_asset: {
    preserve: ["icon language", "brand colors", "shape DNA"],
    change: ["state variant", "context", "size treatment"],
    forbidden: ["unreadable icon", "brand break", "style break"],
  },
  unknown: {
    preserve: ["colors", "shape language", "brand identity", "visual style"],
    change: ["role", "context", "environment", "variant theme"],
    forbidden: ["style break", "color break", "redesign from scratch"],
  },
};

const OBJECT_TYPE_ALIASES: Record<string, AssetVisionObjectType> = {
  character: "character",
  mascot: "mascot",
  human: "human",
  animal: "animal",
  food: "food_item",
  food_item: "food_item",
  product: "product",
  packaging: "packaging",
  vehicle: "vehicle",
  tool: "tool",
  building: "building",
  location: "location",
  environment: "environment",
  logo: "logo",
  brand_asset: "brand_asset",
  illustration: "illustration",
  ui_asset: "ui_asset",
  icon: "ui_asset",
  prop: "product",
  world: "environment",
};

export function normalizeVisionObjectType(raw: string | undefined): AssetVisionObjectType {
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return OBJECT_TYPE_ALIASES[key] ?? "unknown";
}

function getDefaultTransformationRules(objectType: AssetVisionObjectType): VisionTransformationRules {
  if (CHARACTER_LIKE_TYPES.includes(objectType)) {
    return CHARACTER_LIKE_RULES;
  }
  return TYPE_TRANSFORMATION_RULES[objectType] ?? TYPE_TRANSFORMATION_RULES.unknown!;
}

export function resolveVisionTransformationRules(
  objectType: AssetVisionObjectType,
  json: AssetReferenceVisionJson
): VisionTransformationRules {
  const defaults = getDefaultTransformationRules(objectType);
  const fromVision = {
    preserve: asStringArray(json.suggestedPreserve),
    change: asStringArray(json.suggestedChange),
    forbidden: asStringArray(json.suggestedForbidden),
  };

  return {
    preserve: fromVision.preserve.length ? fromVision.preserve : defaults.preserve,
    change: fromVision.change.length ? fromVision.change : defaults.change,
    forbidden: fromVision.forbidden.length ? fromVision.forbidden : defaults.forbidden,
  };
}

export function formatTransformationRulesList(items: string[]): string {
  return items.join(", ");
}

function asStringArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeColorRole(raw: string | undefined): AssetVisionColor["role"] {
  const role = (raw ?? "").trim().toLowerCase();
  if (role === "primary" || role === "secondary" || role === "accent" || role === "other") {
    return role;
  }
  return undefined;
}

function normalizeColors(raw: AssetReferenceVisionJson["colors"]): AssetVisionColor[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((c) => ({
      label: String(c.label ?? "").trim(),
      hex: c.hex?.trim() || undefined,
      role: normalizeColorRole(c.role),
    }))
    .filter((c) => c.label);
}

export function mapVisionJsonToAnalysis(
  json: AssetReferenceVisionJson,
  context?: { sourceName?: string }
): AssetVisionAnalysis {
  const objectType = normalizeVisionObjectType(json.objectType);
  const objectTypeLabel =
    json.objectType?.trim() ||
    (objectType === "unknown" ? "Unknown" : objectType.replace(/_/g, " "));

  const shapeLanguage = asStringArray(json.shapeLanguage);
  const keyFeatures = asStringArray(json.keyFeatures);
  const safetyNotes = asStringArray(json.safetyNotes);
  const rules = resolveVisionTransformationRules(objectType, json);

  const brandIdentity = inferBrandIdentityFromContext({
    rawBrand: json.brandIdentity,
    sourceName: context?.sourceName,
    objectType,
  });

  const assetFamily = inferAssetFamily({
    brandIdentity,
    sourceName: context?.sourceName,
    objectType,
    rawFamily: json.assetFamily,
  });

  const characterLineage = normalizeCharacterLineage(json.characterLineage);
  const brandRecognitionConfidence =
    typeof json.brandRecognitionConfidence === "number" && Number.isFinite(json.brandRecognitionConfidence)
      ? Math.min(1, Math.max(0, json.brandRecognitionConfidence))
      : typeof json.confidence === "number" && Number.isFinite(json.confidence)
        ? Math.min(1, Math.max(0, json.confidence))
        : 0.6;

  const baseAnalysis: AssetVisionAnalysis = {
    objectType,
    objectTypeLabel,
    visualStyle: json.visualStyle?.trim() ?? "",
    colors: normalizeColors(json.colors),
    shapeLanguage,
    keyFeatures,
    brandIdentity,
    materialHints: json.materialHints?.trim() ?? "",
    environmentHints:
      [json.environmentHints, json.architectureHints, json.moodHints].filter(Boolean).join("; ").trim(),
    suggestedPreserve: rules.preserve,
    suggestedChange: rules.change,
    suggestedForbidden: rules.forbidden,
    confidence:
      typeof json.confidence === "number" && Number.isFinite(json.confidence)
        ? Math.min(1, Math.max(0, json.confidence))
        : 0.6,
    safetyNotes,
    assetFamily,
    characterLineage,
    brandRecognitionConfidence,
    identityFingerprint: { fingerprintHash: "" },
  };

  const forbidden = buildAutoForbiddenStyleRules(baseAnalysis);
  const preserve =
    CHARACTER_LIKE_TYPES.includes(objectType)
      ? buildCharacterVariantPreserveRules(baseAnalysis)
      : baseAnalysis.suggestedPreserve;

  const withFingerprint: AssetVisionAnalysis = {
    ...baseAnalysis,
    suggestedPreserve: preserve,
    suggestedForbidden: forbidden,
    identityFingerprint: buildIdentityFingerprintFromVision(
      { ...baseAnalysis, suggestedPreserve: preserve, suggestedForbidden: forbidden },
      json
    ),
  };

  return applyKnownBrandDefaults(withFingerprint, context);
}

export function mapVisionAnalysisToStyleDna(vision: AssetVisionAnalysis): AssetStyleDna {
  const colorTheme = vision.colors.length
    ? vision.colors.map((c) => (c.hex ? `${c.label} (${c.hex})` : c.label)).join(", ")
    : "";

  return {
    visualStyle: vision.visualStyle,
    colorTheme,
    shapeLanguage: vision.shapeLanguage.join(", "),
    outfitHints: vision.keyFeatures.filter((f) => /outfit|clothing|apron|hat|cap/i.test(f)).join(", "),
    brandIdentity: vision.brandIdentity,
    mascotTraits: vision.keyFeatures.slice(0, 4).join(", "),
    confidence: vision.confidence,
  };
}

export function formatVisionColorsForDisplay(colors: AssetVisionColor[]): string {
  if (!colors.length) {
    return "";
  }
  return colors
    .map((c) => {
      const role = c.role && c.role !== "other" ? ` (${c.role})` : "";
      return c.hex ? `${c.label}${role}: ${c.hex}` : `${c.label}${role}`;
    })
    .join("\n");
}

export function draftPatchFromVisionAnalysis(
  vision: AssetVisionAnalysis,
  variantLabel?: string
): Partial<AssetWizardDraft> {
  const styleDna = mapVisionAnalysisToStyleDna(vision);
  const changeRules = variantLabel?.trim()
    ? buildCharacterVariantChangeRules(variantLabel, vision)
    : vision.suggestedChange;

  return {
    sourceVisionAnalysis: vision,
    sourceVisionAnalysisStatus: "ready",
    sourceVisionAnalysisError: "",
    derivationStyleDna: styleDna,
    derivationStyleDnaStatus: "ready",
    derivationStyleDnaError: "",
    sourceTransformPreserve: formatTransformationRulesList(vision.suggestedPreserve),
    sourceTransformChange: formatTransformationRulesList(changeRules),
    sourceTransformForbidden: formatTransformationRulesList(vision.suggestedForbidden),
  };
}

export function buildStyleDnaPromptBlock(styleDna: AssetStyleDna | null | undefined): string {
  if (!styleDna) {
    return "";
  }

  const lines = [
    styleDna.visualStyle ? `Style DNA — visual style: ${styleDna.visualStyle}.` : "",
    styleDna.colorTheme ? `Style DNA — color theme: ${styleDna.colorTheme}.` : "",
    styleDna.shapeLanguage ? `Style DNA — shape language: ${styleDna.shapeLanguage}.` : "",
    styleDna.brandIdentity ? `Style DNA — brand identity: ${styleDna.brandIdentity}.` : "",
    styleDna.outfitHints ? `Style DNA — outfit hints: ${styleDna.outfitHints}.` : "",
    styleDna.mascotTraits ? `Style DNA — character traits: ${styleDna.mascotTraits}.` : "",
  ].filter(Boolean);

  return lines.join(" ");
}

export function buildEnrichedAssetGenerationContext(draft: AssetWizardDraft): string {
  return buildAssetSemanticGenerationContext(buildAssetSemanticGenerationInputFromDraft(draft));
}

export function buildVisionAnalysisPromptBlock(vision: AssetVisionAnalysis | null | undefined): string {
  if (!vision) {
    return "";
  }

  const lines = [
    `Vision analysis: recognized as ${vision.objectTypeLabel}.`,
    vision.visualStyle ? `Visual style: ${vision.visualStyle}.` : "",
    vision.colors.length
      ? `Brand colors: ${vision.colors.map((c) => (c.hex ? `${c.label} ${c.hex}` : c.label)).join(", ")}.`
      : "",
    vision.shapeLanguage.length ? `Shape DNA: ${vision.shapeLanguage.join(", ")}.` : "",
    vision.keyFeatures.length ? `Key features: ${vision.keyFeatures.join(", ")}.` : "",
    vision.brandIdentity ? `Brand identity: ${vision.brandIdentity}.` : "",
    vision.materialHints ? `Materials: ${vision.materialHints}.` : "",
    vision.environmentHints ? `Environment: ${vision.environmentHints}.` : "",
    vision.suggestedPreserve.length ? `Preserve rules: ${vision.suggestedPreserve.join(", ")}.` : "",
    vision.suggestedChange.length ? `Change rules: ${vision.suggestedChange.join(", ")}.` : "",
    vision.suggestedForbidden.length ? `Forbidden: ${vision.suggestedForbidden.join(", ")}.` : "",
  ].filter(Boolean);

  return lines.join(" ");
}

export function canAdvanceFromAssetVisionStep(draft: AssetWizardDraft): boolean {
  return draft.sourceVisionAnalysisStatus === "ready" && Boolean(draft.sourceVisionAnalysis);
}

export function shouldShowAssetVisionStep(draft: AssetWizardDraft): boolean {
  return Boolean(
    draft.sourceReferenceImageUrl?.trim() ||
      draft.derivationSource?.referenceImageUrl?.trim() ||
      draft.sourceReferenceStorageKey?.trim()
  );
}
