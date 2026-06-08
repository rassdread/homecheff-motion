import { hashSemanticText } from "@/lib/studio-asset-semantic-record";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type {
  AssetIdentityFingerprint,
  VariantFidelityScore,
} from "@/types/studio-asset-identity-preservation";
import { VARIANT_FIDELITY_LOW_THRESHOLD } from "@/types/studio-asset-identity-preservation";
import type {
  AssetReferenceVisionJson,
  AssetVisionAnalysis,
  AssetVisionObjectType,
} from "@/types/studio-asset-vision-analysis";

export { VARIANT_FIDELITY_LOW_THRESHOLD };

const UNKNOWN_BRAND_RE =
  /^(unknown(\s+(brand(\s+asset)?|asset))?|generic(\s+asset)?|n\/a|none)$/i;

const FLAT_VECTOR_STYLE_RE =
  /\b(flat|vector|logo|icon|2d|minimal|corporate\s+brand|line\s+art)\b/i;

const PRESERVE_PRIORITY_1 = [
  "face structure",
  "head shape",
  "body proportions",
  "outline style",
  "color palette",
  "identity markers",
  "silhouette",
  "line weight",
  "brand colors",
];

const PRESERVE_PRIORITY_2 = ["pose", "expression", "accessories", "accessory pattern"];

const CHANGE_PRIORITY_3 = ["outfit", "role", "role accessories", "environment", "context"];

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

export function inferBrandIdentityFromContext(params: {
  rawBrand?: string;
  sourceName?: string;
  objectType?: AssetVisionObjectType;
}): string {
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
    return `${sourceName} Mascot`;
  }

  if (params.objectType === "logo" || params.objectType === "brand_asset") {
    return sourceName;
  }

  return raw || sourceName;
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
  const roleChange = variantLabel.trim() ? [`${variantLabel} outfit`, `${variantLabel} role accessories`, "environment"] : [];
  return [...new Set([...CHANGE_PRIORITY_3, ...roleChange, ...fromVision].map((r) => r.trim()).filter(Boolean))];
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
    "Priority order: (1) source image, (2) identity fingerprint, (3) preserve rules, (4) change rules, (5) user instructions.",
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
}): VariantFidelityScore {
  const { source, generated } = params;

  const shapePreservation = tokenOverlapScore(source.shapeLanguage, generated.shapeLanguage);
  const colorPreservation = tokenOverlapScore(
    source.colors.map((c) => c.label),
    generated.colors.map((c) => c.label)
  );
  const brandPreservation = stringSimilarity(source.brandIdentity, generated.brandIdentity);
  const featurePreservation = tokenOverlapScore(source.keyFeatures, generated.keyFeatures);
  const identityPreservation = Math.round(
    shapePreservation * 0.35 + featurePreservation * 0.35 + brandPreservation * 0.3
  );

  const overall = Math.round(
    identityPreservation * 0.4 +
      colorPreservation * 0.25 +
      shapePreservation * 0.2 +
      brandPreservation * 0.15
  );

  return {
    identityPreservation,
    colorPreservation,
    shapePreservation,
    brandPreservation,
    overall,
    lowFidelity: overall < VARIANT_FIDELITY_LOW_THRESHOLD,
  };
}

export function buildStricterPreservePatch(draft: AssetWizardDraft): Partial<AssetWizardDraft> {
  const vision = draft.sourceVisionAnalysis;
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
      "Strict variant: preserve exact face, proportions, silhouette, and brand identity from source.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function resolveSemanticLineageFromDraft(draft: AssetWizardDraft): {
  parentAssetId?: string;
  derivedFromAssetId?: string;
} {
  const sourceId = draft.derivationSource?.assetId;
  if (!sourceId) {
    return {};
  }
  return {
    parentAssetId: sourceId,
    derivedFromAssetId: sourceId,
  };
}
