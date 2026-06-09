import { buildConstructionContinuityPromptBlock } from "@/lib/studio-asset-animation-readiness";
import {
  buildIdentityProfileRules,
  resolveIdentityProfileMotionGuidance,
  resolveVariantFidelityThresholdsForProfile,
  rulesToCommaSeparated,
} from "@/lib/studio-asset-identity-profile";
import {
  buildIdentityShapeMarkerEnforcementBlock,
  buildIdentityShapeMarkersPromptLine,
  formatIdentityShapeMarkersSummary,
} from "@/lib/studio-asset-identity-shape-markers";
import { buildAssetSemanticRecordFromWizardDraft } from "@/lib/studio-asset-semantic-record";
import { hashSemanticText } from "@/lib/studio-asset-semantic-record";
import type { IdentityProfileLevel } from "@/types/studio-asset-identity-profile";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type {
  AssetIdentityFingerprint,
  VariantFidelityRecoveryTier,
  VariantFidelityScore,
} from "@/types/studio-asset-identity-preservation";
import {
  VARIANT_FIDELITY_IDENTITY_FAILURE_THRESHOLD,
  VARIANT_FIDELITY_STRICT_REGENERATE_THRESHOLD,
  VARIANT_FIDELITY_WARNING_THRESHOLD,
} from "@/types/studio-asset-identity-preservation";
import type { AssetIdentityGenerationAudit } from "@/types/studio-asset-identity-generation-audit";
import type { AssetIdentityLockLevel } from "@/types/studio-asset-image-generation";
import type {
  AssetReferenceVisionJson,
  AssetVisionAnalysis,
  AssetVisionObjectType,
} from "@/types/studio-asset-vision-analysis";

export {
  VARIANT_FIDELITY_IDENTITY_FAILURE_THRESHOLD,
  VARIANT_FIDELITY_LOW_THRESHOLD,
  VARIANT_FIDELITY_STRICT_REGENERATE_THRESHOLD,
  VARIANT_FIDELITY_WARNING_THRESHOLD,
} from "@/types/studio-asset-identity-preservation";

const UNKNOWN_BRAND_RE =
  /^(unknown(\s+(brand(\s+asset)?|asset))?|generic(\s+asset)?|n\/a|none)$/i;

const HOME_CHEFF_GLOBE_CONTEXT_RE =
  /home\s*cheff|homecheff|globe\s*man|homecheff\s*globe|homecheff\s*mascot|globe\s*mascot/i;

export const HARD_IDENTITY_LOCK_INTRO = [
  "TRANSFORM THE EXISTING SOURCE CHARACTER.",
  "DO NOT CREATE A NEW CHARACTER.",
  "KEEP THE SAME FACE STRUCTURE, HEAD SHAPE, BODY PROPORTIONS, SILHOUETTE, OUTLINE STYLE, COLOR PALETTE, AND BRAND IDENTITY.",
  "CHANGE ONLY THE REQUESTED ROLE, OUTFIT, AND ACCESSORIES.",
].join(" ");

export const FLAT_MASCOT_STYLE_LOCK = [
  "KEEP 2D FLAT VECTOR LOGO-MASCOT STYLE.",
  "DO NOT CONVERT TO 3D, PIXAR, DISNEY, TOY, CLAY, REALISTIC, OR ANIME STYLE.",
  "DO NOT ADD SKIN TONE.",
  "DO NOT REDESIGN THE FACE.",
].join(" ");

export const STRICT_REGENERATION_IDENTITY_INSTRUCTION =
  "The previous result changed the character identity. Retry with stricter identity preservation.";

export const MANDATORY_FORBIDDEN_RULES = [
  "new character",
  "redesigned face",
  "different head shape",
  "different proportions",
  "3D cartoon style",
  "Pixar/Disney style",
  "realistic human skin",
  "changed brand colors",
  "missing source identity",
  "unrelated chef mascot",
] as const;

export type BrandIdentityContext = {
  rawBrand?: string;
  sourceName?: string;
  sourceId?: string;
  promptText?: string;
  objectType?: AssetVisionObjectType;
  keyFeatures?: string[];
};

const GENERIC_SOURCE_NAME_RE =
  /^(upload|reference|source(\s+image)?|variant|image|file|untitled)$/i;

export function isGenericWizardSourceName(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return !trimmed || GENERIC_SOURCE_NAME_RE.test(trimmed);
}

export function buildBrandIdentitySearchText(params: BrandIdentityContext): string {
  return [
    params.rawBrand,
    params.sourceName,
    params.sourceId,
    params.promptText,
    ...(params.keyFeatures ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function resolveHomeCheffGlobeBrandProfile(searchText: string): {
  brandIdentity: string;
  assetFamily: string;
  characterLineage: string;
} | null {
  if (!HOME_CHEFF_GLOBE_CONTEXT_RE.test(searchText.trim())) {
    return null;
  }
  return {
    brandIdentity: "HomeCheff Globe Mascot",
    assetFamily: "HomeCheff Mascots",
    characterLineage: "Primary Mascot",
  };
}

export function resolveEffectiveBrandIdentity(params: BrandIdentityContext): string {
  return inferBrandIdentityFromContext(params);
}

const FLAT_VECTOR_STYLE_RE =
  /\b(flat|vector|logo|icon|2d|minimal|corporate\s+brand|line\s+art)\b/i;

const PRESERVE_PRIORITY_1 = [
  "face structure",
  "head shape",
  "body proportions",
  "silhouette",
  "outline style",
  "proportions",
  "identity shape markers",
];

const PRESERVE_PRIORITY_2 = [
  "color palette",
  "brand colors",
  "identity markers",
  "line weight",
  "branding",
];

const PRESERVE_PRIORITY_3 = ["pose", "expression"];

const CHANGE_PRIORITY_4 = ["outfit", "role", "role accessories", "accessories", "environment", "context"];

const FLAT_MASCOT_AUTO_FORBIDDEN = [
  "Pixar style",
  "Disney style",
  "Anime style",
  "Photorealistic",
  "3D toy style",
  "Clay style",
  "Color break",
  "Face redesign",
  "Shape redesign",
  "New mascot design",
  "Style break",
];

const CHARACTER_LIKE: AssetVisionObjectType[] = ["character", "mascot", "human", "animal"];

export function isUnknownBrandIdentity(value: string): boolean {
  return !value.trim() || UNKNOWN_BRAND_RE.test(value.trim());
}

export function inferBrandIdentityFromContext(params: BrandIdentityContext): string {
  const searchText = buildBrandIdentitySearchText(params);
  const homeCheffProfile = resolveHomeCheffGlobeBrandProfile(searchText);
  if (homeCheffProfile) {
    return homeCheffProfile.brandIdentity;
  }

  const raw = params.rawBrand?.trim() ?? "";
  if (raw && !isUnknownBrandIdentity(raw)) {
    return raw;
  }

  const sourceName = params.sourceName?.trim() ?? "";
  if (!sourceName) {
    return raw || "Unknown brand asset";
  }

  const homeCheff = /home\s*cheff|homecheff/i.test(sourceName);
  const globe = /globe/i.test(sourceName);
  const mascot = /mascot|man|chef|garden|designer/i.test(sourceName);

  if (homeCheff && globe) {
    return "HomeCheff Globe Mascot";
  }
  if (homeCheff && mascot) {
    return `HomeCheff ${sourceName.replace(/home\s*cheff\s*/i, "").trim() || "Mascot"}`;
  }
  if (globe && params.objectType && CHARACTER_LIKE.includes(params.objectType)) {
    return "HomeCheff Globe Mascot";
  }

  if (params.objectType === "logo" || params.objectType === "brand_asset") {
    return sourceName;
  }

  const featureText = (params.keyFeatures ?? []).join(" ");
  if (
    /globe/i.test(featureText) &&
    params.objectType &&
    CHARACTER_LIKE.includes(params.objectType)
  ) {
    return "HomeCheff Globe Mascot";
  }

  if (isUnknownBrandIdentity(raw)) {
    return "Unknown brand asset";
  }

  return raw || sourceName;
}

export function applyKnownBrandDefaults(
  analysis: AssetVisionAnalysis,
  context?: BrandIdentityContext
): AssetVisionAnalysis {
  const searchText = buildBrandIdentitySearchText({
    ...context,
    rawBrand: analysis.brandIdentity,
    sourceName: context?.sourceName,
    objectType: analysis.objectType,
    keyFeatures: context?.keyFeatures ?? analysis.keyFeatures,
  });
  const profile = resolveHomeCheffGlobeBrandProfile(searchText);
  if (!profile) {
    if (isUnknownBrandIdentity(analysis.brandIdentity) && context?.sourceName?.trim()) {
      const inferred = inferBrandIdentityFromContext({
        rawBrand: analysis.brandIdentity,
        sourceName: context.sourceName,
        sourceId: context.sourceId,
        promptText: context.promptText,
        objectType: analysis.objectType,
        keyFeatures: context.keyFeatures ?? analysis.keyFeatures,
      });
      const family = inferAssetFamily({
        brandIdentity: inferred,
        sourceName: context.sourceName,
        objectType: analysis.objectType,
        rawFamily: analysis.assetFamily,
      });
      return {
        ...analysis,
        brandIdentity: inferred,
        assetFamily: family,
        characterLineage:
          analysis.characterLineage && !isUnknownBrandIdentity(analysis.characterLineage)
            ? analysis.characterLineage
            : normalizeCharacterLineage(undefined),
        identityFingerprint: {
          ...analysis.identityFingerprint,
          brandIdentity: inferred,
        },
      };
    }
    return analysis;
  }

  return {
    ...analysis,
    brandIdentity: profile.brandIdentity,
    assetFamily: profile.assetFamily,
    characterLineage: profile.characterLineage,
    identityFingerprint: {
      ...analysis.identityFingerprint,
      brandIdentity: profile.brandIdentity,
    },
  };
}

export function inferAssetFamily(params: {
  brandIdentity: string;
  sourceName?: string;
  objectType?: AssetVisionObjectType;
  rawFamily?: string;
}): string {
  const raw = params.rawFamily?.trim();
  if (raw && !isUnknownBrandIdentity(raw)) {
    return raw;
  }

  const searchText = buildBrandIdentitySearchText({
    rawBrand: params.brandIdentity,
    sourceName: params.sourceName,
    objectType: params.objectType,
  });
  const homeCheffProfile = resolveHomeCheffGlobeBrandProfile(searchText);
  if (homeCheffProfile) {
    return homeCheffProfile.assetFamily;
  }

  const brand = params.brandIdentity.trim();
  const homeCheff = /home\s*cheff|homecheff/i.test(brand) || /home\s*cheff|homecheff/i.test(params.sourceName ?? "");
  if (homeCheff && params.objectType && CHARACTER_LIKE.includes(params.objectType)) {
    return "HomeCheff Mascots";
  }

  const brandRoot = brand.split(/\s+/).slice(0, 2).join(" ").trim();
  if (brandRoot && !isUnknownBrandIdentity(brandRoot)) {
    if (params.objectType && CHARACTER_LIKE.includes(params.objectType)) {
      return `${brandRoot.split(" ")[0]} Mascots`;
    }
    if (params.objectType === "packaging" || params.objectType === "product") {
      return `${brandRoot.split(" ")[0]} Products`;
    }
    if (params.objectType === "logo" || params.objectType === "brand_asset") {
      return `${brandRoot.split(" ")[0]} Brand Assets`;
    }
    return `${brandRoot} Family`;
  }

  if (params.sourceName?.trim()) {
    return `${params.sourceName.trim()} Family`;
  }

  return "Unknown Asset Family";
}

export function normalizeCharacterLineage(raw: string | undefined): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) {
    return "Primary Mascot";
  }
  if (value.includes("primary")) {
    return "Primary Mascot";
  }
  if (value.includes("variant") || value.includes("role")) {
    return "Role Variant";
  }
  if (value.includes("edition")) {
    return "Edition Variant";
  }
  return raw!.trim();
}

export function buildIdentityFingerprintFromVision(
  vision: AssetVisionAnalysis,
  json?: AssetReferenceVisionJson
): AssetIdentityFingerprint {
  const colorDna = vision.colors.length
    ? vision.colors.map((c) => (c.hex ? `${c.label} ${c.hex}` : c.label)).join(", ")
    : undefined;

  const faceStructure =
    json?.faceStructure?.trim() ||
    vision.keyFeatures.find((f) => /face|eyes|smile|expression|head/i.test(f)) ||
    undefined;

  const fingerprint: AssetIdentityFingerprint = {
    faceStructure,
    outlineStyle:
      json?.outlineStyle?.trim() ||
      (FLAT_VECTOR_STYLE_RE.test(vision.visualStyle) ? vision.visualStyle : vision.shapeLanguage[0]),
    proportions: json?.proportions?.trim() || vision.shapeLanguage.find((s) => /round|proportion|compact/i.test(s)) || undefined,
    colorDna,
    shapeDna: vision.shapeLanguage.join(", ") || undefined,
    brandIdentity: vision.brandIdentity,
    silhouette: json?.silhouette?.trim() || vision.keyFeatures.find((f) => /silhouette|outline|globe|body/i.test(f)),
    accessoryPattern:
      json?.accessoryPattern?.trim() ||
      vision.keyFeatures.filter((f) => /hat|apron|spoon|tool|accessory|glove/i.test(f)).join(", ") ||
      undefined,
    identityShapeMarkers: vision.identityFingerprint.identityShapeMarkers?.length
      ? vision.identityFingerprint.identityShapeMarkers
      : undefined,
  };

  fingerprint.fingerprintHash = hashSemanticText(JSON.stringify(fingerprint));
  return fingerprint;
}

export function formatIdentityFingerprintSummary(fingerprint: AssetIdentityFingerprint): string {
  return [
    fingerprint.faceStructure ? `Face: ${fingerprint.faceStructure}` : "",
    fingerprint.outlineStyle ? `Outline: ${fingerprint.outlineStyle}` : "",
    fingerprint.proportions ? `Proportions: ${fingerprint.proportions}` : "",
    fingerprint.colorDna ? `Colors: ${fingerprint.colorDna}` : "",
    fingerprint.silhouette ? `Silhouette: ${fingerprint.silhouette}` : "",
    formatIdentityShapeMarkersSummary(fingerprint),
    fingerprint.accessoryPattern ? `Accessories: ${fingerprint.accessoryPattern}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function isFlatOrVectorMascotStyle(vision: AssetVisionAnalysis): boolean {
  if (vision.objectType === "logo" || vision.objectType === "brand_asset") {
    return true;
  }
  return FLAT_VECTOR_STYLE_RE.test(vision.visualStyle);
}

export function buildAutoForbiddenStyleRules(vision: AssetVisionAnalysis): string[] {
  const rules = [...vision.suggestedForbidden];
  if (isFlatOrVectorMascotStyle(vision) && CHARACTER_LIKE.includes(vision.objectType)) {
    for (const rule of FLAT_MASCOT_AUTO_FORBIDDEN) {
      if (!rules.some((r) => r.toLowerCase() === rule.toLowerCase())) {
        rules.push(rule);
      }
    }
  }
  return rules;
}

export function buildCharacterVariantPreserveRules(vision?: AssetVisionAnalysis | null): string[] {
  const fromVision = vision?.suggestedPreserve ?? [];
  const merged = [...PRESERVE_PRIORITY_1, ...PRESERVE_PRIORITY_2, ...fromVision];
  return [...new Set(merged.map((r) => r.trim()).filter(Boolean))];
}

export function buildCharacterVariantChangeRules(
  variantLabel: string,
  vision?: AssetVisionAnalysis | null
): string[] {
  const fromVision = vision?.suggestedChange ?? [];
  const roleChange = variantLabel.trim() ? [`${variantLabel} outfit`, `${variantLabel} role accessories`] : [];
  return [...new Set([...CHANGE_PRIORITY_4, ...roleChange, ...fromVision].map((r) => r.trim()).filter(Boolean))];
}

export function buildExactMascotVariantLead(
  sourceName: string,
  variantLabel: string,
  brandIdentity?: string
): string {
  const subject = brandIdentity?.trim() || sourceName;
  return `Make a ${variantLabel} version of this exact mascot "${sourceName}" (${subject}) — NOT a new ${variantLabel} mascot or separate character design.`;
}

export function buildFingerprintLockBlock(identityLockLevel: AssetIdentityLockLevel = 1): string {
  const p1 = PRESERVE_PRIORITY_1.join(", ");
  const p2 = PRESERVE_PRIORITY_2.join(", ");
  const p3 = PRESERVE_PRIORITY_3.join(", ");
  const p4 = CHANGE_PRIORITY_4.join(", ");

  if (identityLockLevel >= 2) {
    return [
      "IDENTITY FINGERPRINT LOCK (level 2 — strict):",
      `P1 LOCKED (never change): ${p1}.`,
      `P2 LOCKED (never change): ${p2}.`,
      `P3 LOCKED (preserve from source): ${p3}.`,
      `P4 ONLY (allowed changes): ${p4}.`,
    ].join(" ");
  }

  return [
    "IDENTITY FINGERPRINT LOCK (level 1):",
    `P1 LOCKED (never change): ${p1}.`,
    `P2 LOCKED (never change): ${p2}.`,
    `P3 PRESERVE (keep unless user explicitly requests change): ${p3}.`,
    `P4 ONLY (default allowed changes): ${p4}.`,
  ].join(" ");
}

export function resolveIdentityLockLevel(params: {
  strictRegeneration?: boolean;
  identityLockLevel?: AssetIdentityLockLevel;
}): AssetIdentityLockLevel {
  if (params.identityLockLevel === 2 || params.strictRegeneration) {
    return 2;
  }
  return 1;
}

export function resolveVariantFidelityRecoveryTier(
  overall: number,
  profileLevel?: IdentityProfileLevel | ""
): VariantFidelityRecoveryTier {
  const thresholds = resolveVariantFidelityThresholdsForProfile(profileLevel);
  if (overall < thresholds.identityFailure) {
    return "identity_failure";
  }
  if (overall < thresholds.strictRegenerate) {
    return "strict_regenerate";
  }
  if (overall < thresholds.warning) {
    return "warning";
  }
  return "ok";
}

export function buildMandatoryForbiddenBlock(
  vision?: AssetVisionAnalysis | null,
  extraForbidden?: string
): string {
  const merged = [
    ...MANDATORY_FORBIDDEN_RULES,
    ...(vision?.suggestedForbidden ?? []),
    ...(extraForbidden ?? "")
      .split(/[,;]+/)
      .map((r) => r.trim())
      .filter(Boolean),
  ];
  const unique = [...new Set(merged.map((r) => r.toLowerCase()))].map((lower) => {
    return merged.find((r) => r.toLowerCase() === lower) ?? lower;
  });
  return `Forbidden:\n- ${unique.join("\n- ")}`;
}

export function buildIdentityEnforcementPromptBlocks(params: {
  sourceName: string;
  variantLabel?: string;
  vision?: AssetVisionAnalysis | null;
  brandIdentity?: string;
  assetFamily?: string;
  strictRegeneration?: boolean;
  identityLockLevel?: AssetIdentityLockLevel;
  identityProfileLevel?: IdentityProfileLevel | "";
}): string[] {
  const vision = params.vision;
  const lockLevel = resolveIdentityLockLevel({
    strictRegeneration: params.strictRegeneration,
    identityLockLevel: params.identityLockLevel,
  });
  const brandIdentity =
    params.brandIdentity?.trim() ||
    resolveEffectiveBrandIdentity({
      rawBrand: vision?.brandIdentity,
      sourceName: params.sourceName,
      promptText: params.variantLabel,
      objectType: vision?.objectType,
    });
  const assetFamily =
    params.assetFamily?.trim() ||
    vision?.assetFamily ||
    inferAssetFamily({
      brandIdentity,
      sourceName: params.sourceName,
      objectType: vision?.objectType,
    });

  const blocks: string[] = [];
  if (params.strictRegeneration) {
    blocks.push(STRICT_REGENERATION_IDENTITY_INSTRUCTION);
  }
  blocks.push(HARD_IDENTITY_LOCK_INTRO);
  blocks.push(buildFingerprintLockBlock(lockLevel));

  if (!vision || isFlatOrVectorMascotStyle(vision)) {
    blocks.push(FLAT_MASCOT_STYLE_LOCK);
  }

  if (params.variantLabel?.trim()) {
    blocks.push(buildExactMascotVariantLead(params.sourceName, params.variantLabel, brandIdentity));
  }

  blocks.push(buildSourceImageFidelityBlock(params.sourceName));
  blocks.push(
    buildVariantTransformationPromptBlock({
      sourceName: params.sourceName,
      variantLabel: params.variantLabel ?? "variant",
      brandIdentity,
      assetFamily,
    })
  );

  const profileGuidance = resolveIdentityProfileMotionGuidance(params.identityProfileLevel);
  if (profileGuidance) {
    blocks.push(`Identity profile: ${profileGuidance}`);
  }

  const shapeMarkerBlock = buildIdentityShapeMarkerEnforcementBlock(params.identityProfileLevel);
  if (shapeMarkerBlock) {
    blocks.push(shapeMarkerBlock);
  }
  const shapeMarkerLine = buildIdentityShapeMarkersPromptLine(vision?.identityFingerprint);
  if (shapeMarkerLine) {
    blocks.push(shapeMarkerLine);
  }

  return blocks.filter(Boolean);
}

export function buildSourceTransformEnforcementPrompt(params: {
  sourceName: string;
  variantLabel?: string;
  vision?: AssetVisionAnalysis | null;
  preserveRules: string;
  changeRules: string;
  forbiddenRules: string;
  instruction?: string;
  semanticContext?: string;
  identityFingerprintSummary?: string;
  strictRegeneration?: boolean;
  identityLockLevel?: AssetIdentityLockLevel;
  identityProfileLevel?: IdentityProfileLevel | "";
}): string {
  const vision = params.vision;
  const brandIdentity = resolveEffectiveBrandIdentity({
    rawBrand: vision?.brandIdentity,
    sourceName: params.sourceName,
    promptText: params.variantLabel,
    objectType: vision?.objectType,
  });

  const sections = [
    ...buildIdentityEnforcementPromptBlocks({
      sourceName: params.sourceName,
      variantLabel: params.variantLabel,
      vision,
      brandIdentity,
      assetFamily: vision?.assetFamily,
      strictRegeneration: params.strictRegeneration,
      identityLockLevel: params.identityLockLevel,
      identityProfileLevel: params.identityProfileLevel,
    }),
    params.semanticContext?.trim() ?? "",
    params.identityFingerprintSummary
      ? `Identity fingerprint: ${params.identityFingerprintSummary}.`
      : "",
    params.instruction?.trim() ? `User instruction: ${params.instruction.trim()}.` : "",
    params.preserveRules.trim() ? `Preserve: ${params.preserveRules.trim()}.` : "",
    params.changeRules.trim() ? `Change: ${params.changeRules.trim()}.` : "",
    buildMandatoryForbiddenBlock(vision, params.forbiddenRules),
  ].filter(Boolean);

  return sections.join("\n\n");
}

export function buildAssetIdentityGenerationAudit(params: {
  sourceName: string;
  sourceImageUrl?: string | null;
  vision?: AssetVisionAnalysis | null;
  preserveRules: string;
  changeRules: string;
  forbiddenRules: string;
  strictRegeneration?: boolean;
  variantLabel?: string;
  identityLockLevel?: AssetIdentityLockLevel;
  generationIntent?: import("@/types/studio-asset-image-generation").AssetGenerationIntent;
  imageGenerationMode?: import("@/types/studio-asset-image-generation").AssetImageGenerationMode;
}): AssetIdentityGenerationAudit {
  const vision = params.vision;
  const brandIdentity = resolveEffectiveBrandIdentity({
    rawBrand: vision?.brandIdentity,
    sourceName: params.sourceName,
    promptText: params.variantLabel,
    objectType: vision?.objectType,
  });
  const assetFamily =
    vision?.assetFamily ||
    inferAssetFamily({
      brandIdentity,
      sourceName: params.sourceName,
      objectType: vision?.objectType,
    });

  return {
    hasSourceImage: Boolean(params.sourceImageUrl?.trim()),
    sourceImageUrl: params.sourceImageUrl ?? null,
    brandIdentity,
    assetFamily,
    characterLineage: vision?.characterLineage || normalizeCharacterLineage(undefined),
    identityFingerprintHash: vision?.identityFingerprint.fingerprintHash,
    preserveRules: params.preserveRules,
    changeRules: params.changeRules,
    forbiddenRules: params.forbiddenRules,
    strictRegeneration: params.strictRegeneration,
    generationIntent: params.generationIntent,
    identityLockLevel: resolveIdentityLockLevel({
      strictRegeneration: params.strictRegeneration,
      identityLockLevel: params.identityLockLevel,
    }),
    imageGenerationMode: params.imageGenerationMode,
  };
}

export function buildVariantTransformationPromptBlock(params: {
  sourceName: string;
  variantLabel: string;
  brandIdentity?: string;
  assetFamily?: string;
}): string {
  const subject = params.brandIdentity?.trim() || params.sourceName;
  const family = params.assetFamily?.trim();
  const lines = [
    `Transform the existing ${subject} "${params.sourceName}" into a ${params.variantLabel} version — do NOT create a new character.`,
    family ? `Asset family: ${family} — stay within this family.` : "",
    "KEEP EXACTLY: face structure, head shape, body proportions, silhouette, outline style, color palette, identity markers, line weight.",
    `CHANGE ONLY: outfit, role accessories, and environment related to ${params.variantLabel}.`,
    "DO NOT: redesign character, alter facial structure, create a new mascot, change color palette, change brand identity.",
  ];
  return lines.filter(Boolean).join(" ");
}

export function buildSourceImageFidelityBlock(sourceName: string): string {
  return [
    `SOURCE IMAGE FIDELITY (highest priority): Match the uploaded source "${sourceName}" exactly.`,
    "The source image overrides generic style suggestions, role creativity, and AI defaults.",
    "Priority order: (1) source image, (2) identity fingerprint, (3) brand identity, (4) asset family, (5) preserve rules, (6) change rules, (7) forbidden rules, (8) user instructions.",
  ].join(" ");
}

function tokenOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const setA = new Set(a.map((t) => t.toLowerCase()));
  const setB = new Set(b.map((t) => t.toLowerCase()));
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      overlap += 1;
    }
  }
  return Math.round((overlap / Math.max(setA.size, setB.size)) * 100);
}

function stringSimilarity(a: string, b: string): number {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 100;
  }
  if (left.includes(right) || right.includes(left)) {
    return 85;
  }
  const leftTokens = left.split(/\s+/);
  const rightTokens = right.split(/\s+/);
  return tokenOverlapScore(leftTokens, rightTokens);
}

export function computeVariantFidelityScore(params: {
  source: AssetVisionAnalysis;
  generated: AssetVisionAnalysis;
  profileLevel?: IdentityProfileLevel | "";
}): VariantFidelityScore {
  const { source, generated } = params;

  const shapePreservation = tokenOverlapScore(source.shapeLanguage, generated.shapeLanguage);
  const colorPreservation = tokenOverlapScore(
    source.colors.map((c) => c.label),
    generated.colors.map((c) => c.label)
  );
  const brandPreservation = stringSimilarity(source.brandIdentity, generated.brandIdentity);
  const familyPreservation = stringSimilarity(source.assetFamily, generated.assetFamily);
  const featurePreservation = tokenOverlapScore(source.keyFeatures, generated.keyFeatures);
  const identityPreservation = Math.round(
    shapePreservation * 0.35 + featurePreservation * 0.35 + brandPreservation * 0.3
  );

  const overall = Math.round(
    identityPreservation * 0.35 +
      colorPreservation * 0.2 +
      shapePreservation * 0.15 +
      brandPreservation * 0.15 +
      familyPreservation * 0.15
  );

  const thresholds = resolveVariantFidelityThresholdsForProfile(params.profileLevel);

  return {
    identityPreservation,
    colorPreservation,
    shapePreservation,
    brandPreservation,
    familyPreservation,
    overall,
    lowFidelity: overall < thresholds.warning,
    recoveryTier: resolveVariantFidelityRecoveryTier(overall, params.profileLevel),
  };
}

export function buildStricterPreservePatch(draft: AssetWizardDraft): Partial<AssetWizardDraft> {
  const vision = draft.sourceVisionAnalysis;
  const semanticRecord = buildAssetSemanticRecordFromWizardDraft(draft);
  const constructionBlock = buildConstructionContinuityPromptBlock(
    semanticRecord?.characterConstructionProfile
  );
  if (draft.identityAssetType && draft.identityProfileLevel) {
    const rules = buildIdentityProfileRules({
      assetType: draft.identityAssetType,
      profileLevel: draft.identityProfileLevel,
      vision,
    });
    const text = rulesToCommaSeparated(rules);
    return {
      sourceTransformPreserve: text.preserve,
      sourceTransformChange: text.change,
      sourceTransformForbidden: [
        text.forbidden,
        "face redesign",
        "new mascot",
        "color palette change",
        "proportion change",
        "outline style change",
      ]
        .filter(Boolean)
        .join(", "),
      sourceTransformInstruction: [
        draft.sourceTransformInstruction.trim(),
        STRICT_REGENERATION_IDENTITY_INSTRUCTION,
        constructionBlock,
        "Strict variant: preserve exact face, proportions, silhouette, and brand identity from source.",
      ]
        .filter(Boolean)
        .join(" "),
      variantRegenerationStrict: true,
    };
  }

  const preserve = buildCharacterVariantPreserveRules(vision).join(", ");
  const forbidden = buildAutoForbiddenStyleRules(
    vision ?? {
      objectType: "unknown",
      objectTypeLabel: "Unknown",
      visualStyle: "",
      colors: [],
      shapeLanguage: [],
      keyFeatures: [],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0,
      identityFingerprint: {},
    }
  ).join(", ");

  const extraForbidden = [
    "face redesign",
    "new mascot",
    "color palette change",
    "proportion change",
    "outline style change",
  ].join(", ");

  return {
    sourceTransformPreserve: preserve,
    sourceTransformForbidden: [forbidden, draft.sourceTransformForbidden, extraForbidden]
      .filter(Boolean)
      .join(", "),
    sourceTransformInstruction: [
      draft.sourceTransformInstruction.trim(),
      STRICT_REGENERATION_IDENTITY_INSTRUCTION,
      constructionBlock,
      "Strict variant: preserve exact face, proportions, silhouette, and brand identity from source.",
    ]
      .filter(Boolean)
      .join(" "),
    variantRegenerationStrict: true,
  };
}

export function resolveSemanticLineageFromDraft(draft: AssetWizardDraft): {
  parentAssetId?: string;
  derivedFromAssetId?: string;
} {
  const sourceId = draft.derivationSource?.assetId?.trim();
  if (sourceId) {
    return {
      parentAssetId: sourceId,
      derivedFromAssetId: sourceId,
    };
  }
  return {};
}
