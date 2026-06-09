import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type {
  IdentityAssetType,
  IdentityProfileConfig,
  IdentityProfileLevel,
  IdentityProfileRules,
} from "@/types/studio-asset-identity-profile";
import {
  VARIANT_FIDELITY_IDENTITY_FAILURE_THRESHOLD,
  VARIANT_FIDELITY_STRICT_REGENERATE_THRESHOLD,
  VARIANT_FIDELITY_WARNING_THRESHOLD,
} from "@/types/studio-asset-identity-preservation";
import { isUnknownBrandIdentity } from "@/lib/studio-asset-identity-preservation";

export const IDENTITY_PROFILE_CONFIGS: Record<IdentityProfileLevel, IdentityProfileConfig> = {
  relaxed: {
    level: "relaxed",
    identityWeight: 0.3,
    creativityWeight: 0.8,
    preserveBoost: ["overall style direction"],
    changeAllowance: ["pose", "expression", "context", "environment", "lighting", "composition"],
    forbiddenBoost: ["unrecognizable subject"],
  },
  balanced: {
    level: "balanced",
    identityWeight: 0.5,
    creativityWeight: 0.5,
    preserveBoost: ["shape language", "color palette", "brand identity"],
    changeAllowance: ["outfit", "role", "context", "environment", "mood"],
    forbiddenBoost: ["style break", "off-brand palette"],
  },
  strict: {
    level: "strict",
    identityWeight: 0.75,
    creativityWeight: 0.35,
    preserveBoost: [
      "face structure",
      "silhouette",
      "color palette",
      "brand identity",
      "key features",
    ],
    changeAllowance: ["outfit", "role accessories", "context"],
    forbiddenBoost: ["face redesign", "silhouette break", "color break", "new subject"],
  },
  brand_lock: {
    level: "brand_lock",
    identityWeight: 0.9,
    creativityWeight: 0.2,
    preserveBoost: [
      "brand colors",
      "logo",
      "symbol",
      "brand identity",
      "shape language",
      "identity markers",
      "identity shape markers",
    ],
    changeAllowance: ["presentation", "context", "edition", "format", "role headwear"],
    forbiddenBoost: [
      "brand break",
      "logo removal",
      "symbol change",
      "color break",
      "unrecognizable brand asset",
      "realistic hair",
      "new hairstyle",
      "human hair rendering",
      "character redesign",
    ],
  },
  master_character: {
    level: "master_character",
    identityWeight: 1,
    creativityWeight: 0.1,
    preserveBoost: [
      "face structure",
      "head shape",
      "body proportions",
      "silhouette",
      "outline style",
      "color palette",
      "brand identity",
      "identity markers",
      "identity shape markers",
    ],
    changeAllowance: ["outfit", "role", "role accessories", "accessories", "role headwear"],
    forbiddenBoost: [
      "new character",
      "redesigned face",
      "different head shape",
      "different proportions",
      "style break",
      "color break",
      "missing source identity",
      "realistic hair",
      "new hairstyle",
      "human hair rendering",
      "character redesign",
    ],
  },
};

const TYPE_BASE_RULES: Record<IdentityAssetType, IdentityProfileRules> = {
  character: {
    preserve: ["face", "colors", "brand identity", "shape language"],
    change: ["outfit", "role", "accessories", "environment"],
    forbidden: ["face change", "style break", "new character"],
  },
  mascot: {
    preserve: ["face", "colors", "brand identity", "silhouette", "shape language", "identity shape markers"],
    change: ["outfit", "role", "accessories", "context", "role headwear"],
    forbidden: ["new mascot", "face redesign", "style break", "color break", "realistic hair"],
  },
  logo: {
    preserve: ["symbol", "brand colors", "identity", "shape language"],
    change: ["presentation", "background", "variant treatment"],
    forbidden: ["symbol change", "color break", "identity break"],
  },
  packaging: {
    preserve: ["logo", "branding", "shape", "brand colors"],
    change: ["edition", "format", "context", "label copy"],
    forbidden: ["logo removal", "brand break", "shape redesign"],
  },
  product: {
    preserve: ["form", "materials", "branding", "brand colors"],
    change: ["context", "usage scene", "edition", "accessories"],
    forbidden: ["form break", "brand break", "unrecognizable product"],
  },
  location: {
    preserve: ["architecture", "layout", "spatial structure"],
    change: ["season", "time of day", "mood", "weather"],
    forbidden: ["layout break", "architecture change", "unrecognizable place"],
  },
  world: {
    preserve: ["visual style", "genre rules", "color palette", "shape language"],
    change: ["season", "mood", "time of day", "story context"],
    forbidden: ["style break", "genre break", "palette break"],
  },
  vehicle: {
    preserve: ["silhouette", "branding", "brand colors"],
    change: ["context", "environment", "livery variant"],
    forbidden: ["silhouette break", "brand break"],
  },
  person: {
    preserve: ["face structure", "recognizable likeness", "proportions"],
    change: ["outfit", "pose", "context", "expression"],
    forbidden: ["different person", "face swap", "unrecognizable likeness"],
  },
  animal: {
    preserve: ["species traits", "silhouette", "color pattern", "identity markers"],
    change: ["pose", "accessories", "context", "environment"],
    forbidden: ["species change", "silhouette break", "unrecognizable animal"],
  },
  building: {
    preserve: ["architecture", "layout", "structural identity"],
    change: ["season", "time of day", "mood", "lighting"],
    forbidden: ["architecture change", "layout break"],
  },
  other: {
    preserve: ["visual style", "key features", "brand identity"],
    change: ["context", "presentation", "environment"],
    forbidden: ["unrecognizable subject", "style break"],
  },
};

export function mapVisionObjectTypeToIdentityAssetType(
  objectType: AssetVisionObjectType,
  vision?: Pick<AssetVisionAnalysis, "objectTypeLabel" | "brandIdentity" | "assetFamily">
): IdentityAssetType {
  if (objectType === "mascot") {
    return "mascot";
  }
  if (objectType === "character") {
    return "character";
  }
  if (objectType === "human") {
    return "person";
  }
  if (objectType === "animal") {
    return "animal";
  }
  if (objectType === "logo" || objectType === "brand_asset") {
    return "logo";
  }
  if (objectType === "packaging") {
    return "packaging";
  }
  if (objectType === "product" || objectType === "food_item") {
    return "product";
  }
  if (objectType === "location") {
    return "location";
  }
  if (objectType === "environment") {
    return "world";
  }
  if (objectType === "building") {
    return "building";
  }
  if (objectType === "vehicle") {
    return "vehicle";
  }

  const label = vision?.objectTypeLabel?.toLowerCase() ?? "";
  if (/mascot/.test(label)) {
    return "mascot";
  }
  if (/logo|brand/.test(label)) {
    return "logo";
  }
  if (/packag/.test(label)) {
    return "packaging";
  }
  if (/location|place|environment/.test(label)) {
    return /world|genre/.test(label) ? "world" : "location";
  }

  return "other";
}

export function isBrandMascotVision(
  vision: Pick<AssetVisionAnalysis, "objectType" | "brandIdentity" | "assetFamily">
): boolean {
  if (vision.objectType !== "mascot" && vision.objectType !== "character") {
    return false;
  }
  const brand = vision.brandIdentity?.trim() ?? "";
  const family = vision.assetFamily?.trim() ?? "";
  if (isUnknownBrandIdentity(brand)) {
    return false;
  }
  return /mascot|brand|character/i.test(family) || /mascot|brand/i.test(brand);
}

export function suggestIdentityProfileLevel(
  assetType: IdentityAssetType,
  vision?: AssetVisionAnalysis | null
): IdentityProfileLevel {
  if (assetType === "mascot" && vision && isBrandMascotVision(vision)) {
    return "master_character";
  }

  switch (assetType) {
    case "character":
    case "person":
    case "animal":
    case "product":
    case "vehicle":
      return "strict";
    case "mascot":
    case "logo":
    case "packaging":
      return "brand_lock";
    case "location":
    case "world":
    case "building":
      return "balanced";
    default:
      return "balanced";
  }
}

export type IdentityProfileRecommendationReason =
  | "master_character_brand_mascot"
  | "brand_lock_logo"
  | "brand_lock_packaging"
  | "brand_lock_brand_asset"
  | "strict_subject"
  | "balanced_environment"
  | "relaxed_exploration"
  | "default";

export type IdentityProfileRecommendation = {
  assetType: IdentityAssetType;
  profileLevel: IdentityProfileLevel;
  reason: IdentityProfileRecommendationReason;
};

export type IdentityProfileFidelityThresholds = {
  warning: number;
  strictRegenerate: number;
  identityFailure: number;
};

export function formatIdentityWeightPercent(level: IdentityProfileLevel): number {
  if (level === "master_character") {
    return 98;
  }
  return Math.round(IDENTITY_PROFILE_CONFIGS[level].identityWeight * 100);
}

export function formatCreativityWeightPercent(level: IdentityProfileLevel): number {
  return Math.round(IDENTITY_PROFILE_CONFIGS[level].creativityWeight * 100);
}

export function resolveIdentityProfileRecommendationReason(
  assetType: IdentityAssetType,
  profileLevel: IdentityProfileLevel,
  vision?: AssetVisionAnalysis | null
): IdentityProfileRecommendationReason {
  if (profileLevel === "master_character" && vision && isBrandMascotVision(vision)) {
    return "master_character_brand_mascot";
  }
  if (profileLevel === "brand_lock") {
    if (assetType === "logo") {
      return "brand_lock_logo";
    }
    if (assetType === "packaging") {
      return "brand_lock_packaging";
    }
    return "brand_lock_brand_asset";
  }
  if (profileLevel === "strict") {
    return "strict_subject";
  }
  if (profileLevel === "balanced") {
    return "balanced_environment";
  }
  if (profileLevel === "relaxed") {
    return "relaxed_exploration";
  }
  return "default";
}

export function buildIdentityProfileRecommendation(
  vision: AssetVisionAnalysis
): IdentityProfileRecommendation {
  const assetType = mapVisionObjectTypeToIdentityAssetType(vision.objectType, vision);
  const profileLevel = suggestIdentityProfileLevel(assetType, vision);
  return {
    assetType,
    profileLevel,
    reason: resolveIdentityProfileRecommendationReason(assetType, profileLevel, vision),
  };
}

export function resolveVariantFidelityThresholdsForProfile(
  level?: IdentityProfileLevel | ""
): IdentityProfileFidelityThresholds {
  switch (level) {
    case "relaxed":
      return { warning: 60, strictRegenerate: 40, identityFailure: 25 };
    case "balanced":
      return { warning: 70, strictRegenerate: 50, identityFailure: 30 };
    case "strict":
      return {
        warning: VARIANT_FIDELITY_WARNING_THRESHOLD,
        strictRegenerate: VARIANT_FIDELITY_STRICT_REGENERATE_THRESHOLD,
        identityFailure: VARIANT_FIDELITY_IDENTITY_FAILURE_THRESHOLD,
      };
    case "brand_lock":
      return { warning: 88, strictRegenerate: 72, identityFailure: 55 };
    case "master_character":
      return { warning: 92, strictRegenerate: 80, identityFailure: 65 };
    default:
      return {
        warning: VARIANT_FIDELITY_WARNING_THRESHOLD,
        strictRegenerate: VARIANT_FIDELITY_STRICT_REGENERATE_THRESHOLD,
        identityFailure: VARIANT_FIDELITY_IDENTITY_FAILURE_THRESHOLD,
      };
  }
}

export function resolveIdentityProfileMotionGuidance(level?: IdentityProfileLevel | ""): string {
  switch (level) {
    case "master_character":
      return "Maximum character continuity — preserve face, silhouette, and brand identity across every scene.";
    case "brand_lock":
      return "Brand protection mode — logos, colors, and brand markers must remain intact.";
    case "strict":
      return "High recognizability — keep subject identity clearly consistent.";
    case "balanced":
      return "Balanced continuity — preserve place and style while allowing mood changes.";
    case "relaxed":
      return "Flexible interpretation — prioritize creative direction over strict identity lock.";
    default:
      return "";
  }
}

export type IdentityProfileConsumptionFields = {
  identityAssetType?: IdentityAssetType | string;
  identityProfile?: IdentityProfileLevel | string;
  identityImportance?: string;
};

export function blocksReplacementAssetSuggestion(
  profile?: IdentityProfileLevel | string | ""
): boolean {
  return profile === "master_character";
}

export function scoreIdentityProfileDirectorBoost(
  profile?: IdentityProfileLevel | string | ""
): number {
  switch (profile) {
    case "master_character":
      return 5;
    case "brand_lock":
      return 3;
    case "strict":
      return 2;
    case "balanced":
      return 1;
    default:
      return 0;
  }
}

export function resolveDirectorIdentityProfileGuidance(
  level?: IdentityProfileLevel | string | ""
): string {
  switch (level) {
    case "master_character":
      return "Director: maximum identity continuity — do not replace or redesign this asset; reuse the existing reference in every scene.";
    case "brand_lock":
      return "Director: brand protection — preserve logos, colors, and brand markers in all scene planning.";
    case "strict":
      return "Director: prioritize recognizability — keep this subject clearly identifiable across scenes.";
    case "balanced":
      return "Director: balanced continuity — preserve core identity while allowing mood and context changes.";
    case "relaxed":
      return "Director: flexible interpretation — creative direction may override strict identity lock.";
    default:
      return "";
  }
}

export function buildIdentityProfileConsumptionLines(
  record: IdentityProfileConsumptionFields & {
    brandIdentity?: string;
    assetFamily?: string;
    preserveRules?: string[];
  }
): string[] {
  const lines: string[] = [];
  if (record.identityAssetType) {
    lines.push(`Asset type: ${record.identityAssetType}`);
  }
  if (record.identityProfile) {
    lines.push(`Identity profile: ${record.identityProfile}`);
  }
  if (record.identityImportance) {
    lines.push(`Identity importance: ${record.identityImportance}`);
  }
  const guidance = resolveIdentityProfileMotionGuidance(
    record.identityProfile as IdentityProfileLevel | ""
  );
  if (guidance) {
    lines.push(guidance);
  }
  return lines;
}

export function formatIdentityProfileDirectorLabel(
  record: IdentityProfileConsumptionFields
): string {
  const parts: string[] = [];
  if (record.identityAssetType) {
    parts.push(`Type: ${record.identityAssetType}`);
  }
  if (record.identityProfile) {
    parts.push(`Profile: ${record.identityProfile.replace(/_/g, " ")}`);
  }
  if (record.identityImportance) {
    parts.push(`Importance: ${record.identityImportance}`);
  }
  return parts.join(" · ");
}

export function resolveIdentityImportanceLabel(level: IdentityProfileLevel): string {
  switch (level) {
    case "relaxed":
      return "flexible";
    case "balanced":
      return "balanced";
    case "strict":
      return "important";
    case "brand_lock":
    case "master_character":
      return "critical";
    default:
      return "balanced";
  }
}

function uniqueRules(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function buildIdentityProfileRules(params: {
  assetType: IdentityAssetType;
  profileLevel: IdentityProfileLevel;
  vision?: AssetVisionAnalysis | null;
}): IdentityProfileRules {
  const config = IDENTITY_PROFILE_CONFIGS[params.profileLevel];
  const base = TYPE_BASE_RULES[params.assetType];
  const vision = params.vision;

  const preserve = uniqueRules([
    ...base.preserve,
    ...(vision?.suggestedPreserve ?? []),
    ...config.preserveBoost,
  ]);

  const change = uniqueRules([
    ...base.change,
    ...(vision?.suggestedChange ?? []),
    ...config.changeAllowance,
  ]);

  const forbidden = uniqueRules([
    ...base.forbidden,
    ...(vision?.suggestedForbidden ?? []),
    ...config.forbiddenBoost,
  ]);

  if (config.identityWeight >= 0.75) {
    preserve.unshift("source identity");
  }
  if (config.creativityWeight <= 0.25) {
    forbidden.push("creative reinterpretation");
  }

  const shapeMarkers = vision?.identityFingerprint.identityShapeMarkers ?? [];
  if (shapeMarkers.length) {
    preserve.push("identity shape markers", ...shapeMarkers);
  }

  return {
    preserve: uniqueRules(preserve),
    change: uniqueRules(change),
    forbidden: uniqueRules(forbidden),
  };
}

export function rulesToCommaSeparated(rules: IdentityProfileRules): {
  preserve: string;
  change: string;
  forbidden: string;
} {
  return {
    preserve: rules.preserve.join(", "),
    change: rules.change.join(", "),
    forbidden: rules.forbidden.join(", "),
  };
}

export function buildIdentityProfileDraftPatch(
  draft: AssetWizardDraft,
  params: {
    assetType: IdentityAssetType;
    profileLevel: IdentityProfileLevel;
    confirmed?: boolean;
  }
): Partial<AssetWizardDraft> {
  const rules = buildIdentityProfileRules({
    assetType: params.assetType,
    profileLevel: params.profileLevel,
    vision: draft.sourceVisionAnalysis,
  });
  const text = rulesToCommaSeparated(rules);

  return {
    identityAssetType: params.assetType,
    identityProfileLevel: params.profileLevel,
    identityProfileConfirmed: params.confirmed ?? draft.identityProfileConfirmed,
    sourceTransformPreserve: text.preserve,
    sourceTransformChange: text.change,
    sourceTransformForbidden: text.forbidden,
  };
}

export function seedIdentityProfileFromVision(draft: AssetWizardDraft): Partial<AssetWizardDraft> {
  const vision = draft.sourceVisionAnalysis;
  if (!vision) {
    return {};
  }

  const assetType = mapVisionObjectTypeToIdentityAssetType(vision.objectType, vision);
  const profileLevel = suggestIdentityProfileLevel(assetType, vision);

  return buildIdentityProfileDraftPatch(draft, {
    assetType,
    profileLevel,
    confirmed: false,
  });
}

export function hasConfirmedIdentityProfile(draft: AssetWizardDraft): boolean {
  return (
    draft.identityProfileConfirmed &&
    Boolean(draft.identityAssetType) &&
    Boolean(draft.identityProfileLevel)
  );
}
