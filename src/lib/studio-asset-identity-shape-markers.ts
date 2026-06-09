import type { IdentityProfileLevel } from "@/types/studio-asset-identity-profile";
import type { AssetIdentityFingerprint } from "@/types/studio-asset-identity-preservation";
import type {
  AssetReferenceVisionJson,
  AssetVisionAnalysis,
  AssetVisionObjectType,
} from "@/types/studio-asset-vision-analysis";

const HAIR_TERM_RE = /\b(hair|hairstyle|hair\s*color|hairline|bangs|ponytail|braid|curly\s+hair|straight\s+hair)\b/i;

const ROLE_HEADWEAR_RE =
  /\b(chef\s*hat|cook\s*hat|toque|garden\s*hat|sun\s*hat|cap|baseball\s*cap|helmet|hard\s*hat|crown|tiara|beanie|beret|safety\s*gear|headwear|head\s*gear)\b/i;

const IDENTITY_SHAPE_SIGNAL_RE =
  /\b(upper[\s-]?head|top\s+of\s+head|forehead|mascot\s+crown|crown\s+shape|horn|antenna|ear\s+silhouette|globe\s+(head|body|face)|brand\s+silhouette|logo\s+silhouette|signature\s+(head|shape|top)|head\s+region|colored\s+head|identity\s+marker|shape\s+marker|silhouette\s+marker)\b/i;

const REALISTIC_HUMAN_STYLE_RE = /\b(photo|photograph|realistic|portrait|live\s+action|cinematic\s+realism)\b/i;

const FLAT_VECTOR_STYLE_RE =
  /\b(flat|vector|logo|icon|2d|minimal|corporate\s+brand|line\s+art|cartoon)\b/i;

const HOME_CHEFF_GLOBE_CONTEXT_RE =
  /home\s*cheff|homecheff|globe\s*man|homecheff\s*globe|homecheff\s*mascot|globe\s*mascot/i;

const UNKNOWN_BRAND_RE =
  /^(unknown(\s+(brand(\s+asset)?|asset))?|generic(\s+asset)?|n\/a|none)$/i;

function isUnknownBrand(value: string): boolean {
  return !value.trim() || UNKNOWN_BRAND_RE.test(value.trim());
}

function isHomeCheffGlobeContext(text: string): boolean {
  return HOME_CHEFF_GLOBE_CONTEXT_RE.test(text.trim());
}

function isBrandMascotContext(context: HairClassificationContext): boolean {
  if (context.objectType !== "mascot" && context.objectType !== "character") {
    return false;
  }
  const brand = context.brandIdentity?.trim() ?? "";
  const family = context.assetFamily?.trim() ?? "";
  if (isUnknownBrand(brand)) {
    return false;
  }
  return /mascot|brand|character/i.test(family) || /mascot|brand/i.test(brand);
}

function isFlatOrVectorStyle(visualStyle: string, objectType: AssetVisionObjectType): boolean {
  if (objectType === "logo" || objectType === "brand_asset") {
    return true;
  }
  return FLAT_VECTOR_STYLE_RE.test(visualStyle);
}

export const MASTER_CHARACTER_SILHOUETTE_RULE = [
  "MASTER CHARACTER RULE: The upper-head color region, silhouette markers, brand-specific shape markers, and visual identity shapes are part of the character identity.",
  "They are NOT hair. Role-specific headwear may be added (chef hat, garden hat, cap, helmet, crown, safety gear, cultural headwear) as long as the original head silhouette stays recognizable.",
].join(" ");

export const MASTER_CHARACTER_SILHOUETTE_ENFORCEMENT = [
  "The source character's signature head shape, identity shape markers, brand silhouette markers, and upper-head design elements must remain recognizable.",
  "Do not replace them with realistic hair, new hairstyles, human hair rendering, or unrelated character redesigns.",
  "Headwear is allowed. Character redesign is not.",
].join(" ");

export const IDENTITY_SHAPE_MARKER_P1 = "identity shape markers";

const SILHOUETTE_FORBIDDEN_BOOST = [
  "realistic hair",
  "new hairstyle",
  "human hair rendering",
  "character redesign",
  "hair replacement for brand head form",
];

const CHARACTER_LIKE: AssetVisionObjectType[] = ["character", "mascot", "human", "animal"];

export type HairClassificationContext = {
  objectType: AssetVisionObjectType;
  visualStyle: string;
  brandIdentity: string;
  assetFamily: string;
  sourceName?: string;
};

export function isCharacterLikeVisionType(objectType: AssetVisionObjectType): boolean {
  return CHARACTER_LIKE.includes(objectType);
}

export function shouldReclassifyHairAsIdentityMarker(context: HairClassificationContext): boolean {
  if (context.objectType === "human") {
    return !REALISTIC_HUMAN_STYLE_RE.test(context.visualStyle);
  }
  if (context.objectType === "mascot" || context.objectType === "character") {
    return true;
  }
  if (context.objectType === "animal") {
    return false;
  }
  const search = [context.brandIdentity, context.assetFamily, context.sourceName ?? ""].join(" ");
  if (isHomeCheffGlobeContext(search)) {
    return true;
  }
  if (isBrandMascotContext(context)) {
    return true;
  }
  return isFlatOrVectorStyle(context.visualStyle, context.objectType);
}

function hairTermToIdentityMarker(feature: string): string {
  return feature
    .replace(/\bhairstyle\b/gi, "signature head form")
    .replace(/\bhair\s*color\b/gi, "upper-head color region")
    .replace(/\bhairline\b/gi, "forehead silhouette")
    .replace(/\bhair\b/gi, "identity shape region")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHairLikeFeature(
  feature: string,
  context: HairClassificationContext
): { text: string; marker?: string } {
  const trimmed = feature.trim();
  if (!trimmed) {
    return { text: trimmed };
  }

  if (IDENTITY_SHAPE_SIGNAL_RE.test(trimmed) && !HAIR_TERM_RE.test(trimmed)) {
    return { text: trimmed, marker: trimmed };
  }

  if (!HAIR_TERM_RE.test(trimmed)) {
    return { text: trimmed };
  }

  if (!shouldReclassifyHairAsIdentityMarker(context)) {
    return { text: trimmed };
  }

  const marker = hairTermToIdentityMarker(trimmed);
  return { text: marker, marker };
}

function reclassifyStringList(
  items: string[],
  context: HairClassificationContext
): { items: string[]; markers: string[] } {
  const markers: string[] = [];
  const next = items.map((item) => {
    const normalized = normalizeHairLikeFeature(item, context);
    if (normalized.marker) {
      markers.push(normalized.marker);
    }
    return normalized.text;
  });
  return { items: [...new Set(next.map((s) => s.trim()).filter(Boolean))], markers };
}

export function extractIdentityShapeMarkers(
  vision: AssetVisionAnalysis,
  json?: AssetReferenceVisionJson
): string[] {
  const context: HairClassificationContext = {
    objectType: vision.objectType,
    visualStyle: vision.visualStyle,
    brandIdentity: vision.brandIdentity,
    assetFamily: vision.assetFamily,
  };

  const markers: string[] = [];

  for (const source of [
    ...vision.keyFeatures,
    ...vision.shapeLanguage,
    ...vision.suggestedPreserve,
    json?.silhouette,
    json?.faceStructure,
    json?.outlineStyle,
    vision.identityFingerprint.silhouette,
    vision.identityFingerprint.faceStructure,
    vision.identityFingerprint.outlineStyle,
  ]) {
    if (!source?.trim()) {
      continue;
    }
    const normalized = normalizeHairLikeFeature(source, context);
    if (normalized.marker) {
      markers.push(normalized.marker);
    } else if (IDENTITY_SHAPE_SIGNAL_RE.test(source) && shouldReclassifyHairAsIdentityMarker(context)) {
      markers.push(source.trim());
    }
  }

  if (isHomeCheffGlobeContext(
    [vision.brandIdentity, vision.assetFamily, vision.characterLineage].join(" ")
  )) {
    markers.push("blue upper-head region", "globe head silhouette", "signature mascot head form");
  }

  return [...new Set(markers.map((m) => m.trim()).filter(Boolean))];
}

export function applyVisionIdentityShapeMarkerNormalization(
  analysis: AssetVisionAnalysis,
  json?: AssetReferenceVisionJson,
  context?: { sourceName?: string }
): AssetVisionAnalysis {
  const hairContext: HairClassificationContext = {
    objectType: analysis.objectType,
    visualStyle: analysis.visualStyle,
    brandIdentity: analysis.brandIdentity,
    assetFamily: analysis.assetFamily,
    sourceName: context?.sourceName,
  };

  if (!shouldReclassifyHairAsIdentityMarker(hairContext) && !isCharacterLikeVisionType(analysis.objectType)) {
    return analysis;
  }

  const keyFeatures = reclassifyStringList(analysis.keyFeatures, hairContext);
  const shapeLanguage = reclassifyStringList(analysis.shapeLanguage, hairContext);
  const suggestedPreserve = reclassifyStringList(analysis.suggestedPreserve, hairContext);

  const identityShapeMarkers = [
    ...new Set([
      ...extractIdentityShapeMarkers(
        {
          ...analysis,
          keyFeatures: keyFeatures.items,
          shapeLanguage: shapeLanguage.items,
          suggestedPreserve: suggestedPreserve.items,
        },
        json
      ),
      ...keyFeatures.markers,
      ...shapeLanguage.markers,
      ...suggestedPreserve.markers,
    ]),
  ];

  const faceStructureRaw = json?.faceStructure?.trim() || analysis.identityFingerprint.faceStructure;
  const faceNormalized = faceStructureRaw
    ? normalizeHairLikeFeature(faceStructureRaw, hairContext)
    : { text: undefined as string | undefined };

  const silhouetteRaw = json?.silhouette?.trim() || analysis.identityFingerprint.silhouette;
  const silhouetteNormalized = silhouetteRaw
    ? normalizeHairLikeFeature(silhouetteRaw, hairContext)
    : { text: undefined as string | undefined };

  const identityFingerprint: AssetIdentityFingerprint = {
    ...analysis.identityFingerprint,
    faceStructure: faceNormalized.text || faceStructureRaw,
    silhouette: silhouetteNormalized.text || silhouetteRaw,
    identityShapeMarkers: identityShapeMarkers.length ? identityShapeMarkers : undefined,
  };

  const suggestedForbidden = [...analysis.suggestedForbidden];
  if (identityShapeMarkers.length && isCharacterLikeVisionType(analysis.objectType)) {
    for (const rule of SILHOUETTE_FORBIDDEN_BOOST) {
      if (!suggestedForbidden.some((r) => r.toLowerCase() === rule.toLowerCase())) {
        suggestedForbidden.push(rule);
      }
    }
  }

  return {
    ...analysis,
    keyFeatures: keyFeatures.items,
    shapeLanguage: shapeLanguage.items,
    suggestedPreserve: suggestedPreserve.items,
    suggestedForbidden,
    identityFingerprint,
  };
}

export function buildIdentityShapeMarkerEnforcementBlock(
  profileLevel?: IdentityProfileLevel | ""
): string {
  if (profileLevel !== "master_character" && profileLevel !== "brand_lock") {
    return "";
  }
  return [MASTER_CHARACTER_SILHOUETTE_RULE, MASTER_CHARACTER_SILHOUETTE_ENFORCEMENT].join(" ");
}

export function buildIdentityShapeMarkersPromptLine(
  fingerprint?: AssetIdentityFingerprint | null
): string {
  const markers = fingerprint?.identityShapeMarkers?.filter(Boolean) ?? [];
  if (!markers.length) {
    return "";
  }
  return `Identity shape markers (P1 locked — not hair): ${markers.join(", ")}.`;
}

export function formatIdentityShapeMarkersSummary(
  fingerprint?: AssetIdentityFingerprint | null
): string {
  const markers = fingerprint?.identityShapeMarkers?.filter(Boolean) ?? [];
  if (!markers.length) {
    return "";
  }
  return `Shape markers: ${markers.join(", ")}`;
}

export function isAllowedRoleHeadwearTerm(term: string): boolean {
  return ROLE_HEADWEAR_RE.test(term);
}
