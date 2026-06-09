import { createHash } from "node:crypto";
import {
  resolveSemanticLineageFromDraft,
} from "@/lib/studio-asset-identity-preservation";
import {
  buildCharacterConstructionProfile,
  formatBodySummary,
  formatCharacterConstructionSummary,
  formatPostureSummary,
} from "@/lib/studio-asset-animation-readiness";
import {
  formatIdentityProfileDirectorLabel,
  resolveIdentityImportanceLabel,
} from "@/lib/studio-asset-identity-profile";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import {
  ASSET_SEMANTIC_MARKER,
  ASSET_SEMANTIC_RECORD_VERSION,
  type AssetSemanticRecord,
} from "@/types/studio-asset-semantic-record";

export function hashSemanticText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function emptyAssetSemanticRecord(): AssetSemanticRecord {
  return { version: ASSET_SEMANTIC_RECORD_VERSION };
}

export function parseAssetSemanticRecordFromNotes(rawNotes: string | null | undefined): {
  humanNotes: string;
  record: AssetSemanticRecord | null;
} {
  const trimmed = (rawNotes ?? "").trim();
  const markerIndex = trimmed.indexOf(ASSET_SEMANTIC_MARKER);
  if (markerIndex === -1) {
    return { humanNotes: trimmed, record: null };
  }

  const humanNotes = trimmed.slice(0, markerIndex).trim();
  const jsonPart = trimmed.slice(markerIndex + ASSET_SEMANTIC_MARKER.length).trim();
  if (!jsonPart) {
    return { humanNotes, record: null };
  }

  try {
    const parsed = JSON.parse(jsonPart) as Partial<AssetSemanticRecord>;
    if (parsed.version !== ASSET_SEMANTIC_RECORD_VERSION) {
      return { humanNotes, record: null };
    }
    return { humanNotes, record: normalizeAssetSemanticRecord(parsed) };
  } catch {
    return { humanNotes, record: null };
  }
}

function normalizeAssetSemanticRecord(raw: Partial<AssetSemanticRecord>): AssetSemanticRecord {
  return {
    version: ASSET_SEMANTIC_RECORD_VERSION,
    visionSummary: raw.visionSummary?.trim() || undefined,
    objectType: raw.objectType?.trim() || undefined,
    visualStyle: raw.visualStyle?.trim() || undefined,
    shapeDna: Array.isArray(raw.shapeDna) ? raw.shapeDna.map(String).filter(Boolean) : undefined,
    brandIdentity: raw.brandIdentity?.trim() || undefined,
    primaryColors: Array.isArray(raw.primaryColors)
      ? raw.primaryColors
          .map((c) => ({ label: String(c.label ?? "").trim(), hex: c.hex?.trim() || undefined }))
          .filter((c) => c.label)
      : undefined,
    keyFeatures: Array.isArray(raw.keyFeatures) ? raw.keyFeatures.map(String).filter(Boolean) : undefined,
    preserveRules: Array.isArray(raw.preserveRules)
      ? raw.preserveRules.map(String).filter(Boolean)
      : undefined,
    changeRules: Array.isArray(raw.changeRules) ? raw.changeRules.map(String).filter(Boolean) : undefined,
    forbiddenRules: Array.isArray(raw.forbiddenRules)
      ? raw.forbiddenRules.map(String).filter(Boolean)
      : undefined,
    visualKeywords: Array.isArray(raw.visualKeywords)
      ? raw.visualKeywords.map(String).filter(Boolean)
      : undefined,
    appearanceMemory: raw.appearanceMemory?.trim() || undefined,
    continuityNotes: raw.continuityNotes?.trim() || undefined,
    referenceIdentity: raw.referenceIdentity?.trim() || undefined,
    worldContext: raw.worldContext?.trim() || undefined,
    roleContext: raw.roleContext?.trim() || undefined,
    updatedAt: raw.updatedAt?.trim() || undefined,
    assetFamily: raw.assetFamily?.trim() || undefined,
    parentAssetId: raw.parentAssetId?.trim() || undefined,
    derivedFromAssetId: raw.derivedFromAssetId?.trim() || undefined,
    identityFingerprint: raw.identityFingerprint ?? undefined,
    variantFidelityOverall:
      typeof raw.variantFidelityOverall === "number" ? raw.variantFidelityOverall : undefined,
    variantIdentityScore:
      typeof raw.variantIdentityScore === "number" ? raw.variantIdentityScore : undefined,
    variantFamilyScore:
      typeof raw.variantFamilyScore === "number" ? raw.variantFamilyScore : undefined,
    variantBrandScore:
      typeof raw.variantBrandScore === "number" ? raw.variantBrandScore : undefined,
    variantShapeMarkerScore:
      typeof raw.variantShapeMarkerScore === "number" ? raw.variantShapeMarkerScore : undefined,
    sourceReferenceName: raw.sourceReferenceName?.trim() || undefined,
    identityAssetType: raw.identityAssetType?.trim() || undefined,
    identityProfile: raw.identityProfile ?? undefined,
    identityImportance: raw.identityImportance?.trim() || undefined,
    characterConstructionProfile: raw.characterConstructionProfile ?? undefined,
    animationReadinessScore:
      typeof raw.animationReadinessScore === "number" ? raw.animationReadinessScore : undefined,
    animationPreparationActions: Array.isArray(raw.animationPreparationActions)
      ? raw.animationPreparationActions.map(String).filter(Boolean)
      : undefined,
  };
}

export function serializeAssetSemanticRecordToNotes(
  humanNotes: string,
  record: AssetSemanticRecord
): string {
  const base = humanNotes.trim();
  const payload = JSON.stringify({ ...record, version: ASSET_SEMANTIC_RECORD_VERSION });
  return base ? `${base}\n${ASSET_SEMANTIC_MARKER}${payload}` : `${ASSET_SEMANTIC_MARKER}${payload}`;
}

export function buildAssetSemanticRecordFromVision(
  vision: AssetVisionAnalysis,
  extras?: Partial<AssetSemanticRecord>
): AssetSemanticRecord {
  const visionSummary = [
    vision.objectTypeLabel,
    vision.visualStyle,
    vision.brandIdentity,
    vision.keyFeatures.slice(0, 4).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return normalizeAssetSemanticRecord({
    version: ASSET_SEMANTIC_RECORD_VERSION,
    visionSummary,
    objectType: vision.objectTypeLabel,
    visualStyle: vision.visualStyle,
    shapeDna: vision.shapeLanguage,
    brandIdentity: vision.brandIdentity,
    assetFamily: vision.assetFamily,
    primaryColors: vision.colors.map((c) => ({ label: c.label, hex: c.hex })),
    keyFeatures: vision.keyFeatures,
    preserveRules: vision.suggestedPreserve,
    changeRules: vision.suggestedChange,
    forbiddenRules: vision.suggestedForbidden,
    appearanceMemory: [
      vision.visualStyle,
      vision.keyFeatures.join(", "),
      vision.materialHints,
      vision.environmentHints,
    ]
      .filter(Boolean)
      .join(". "),
    continuityNotes: vision.suggestedPreserve.join(", "),
    referenceIdentity: vision.brandIdentity,
    visualKeywords: [
      vision.objectTypeLabel,
      vision.visualStyle,
      vision.assetFamily,
      ...vision.shapeLanguage,
      ...vision.colors.map((c) => c.label),
    ].filter(Boolean),
    identityFingerprint: vision.identityFingerprint,
    updatedAt: new Date().toISOString(),
    ...extras,
  });
}

function animationPreparationExtrasFromDraft(
  draft: AssetWizardDraft
): Partial<AssetSemanticRecord> {
  const construction = buildCharacterConstructionProfile(draft);
  if (!construction && !draft.animationReadinessAnalysis) {
    return {};
  }
  return {
    characterConstructionProfile: construction ?? undefined,
    animationReadinessScore: draft.animationReadinessAnalysis?.score,
    animationPreparationActions: draft.animationPreparationActions.length
      ? draft.animationPreparationActions
      : undefined,
  };
}

export function variantAuditScoresFromRecord(record: AssetSemanticRecord): {
  variantIdentityScore?: number;
  variantFamilyScore?: number;
  variantBrandScore?: number;
  variantShapeMarkerScore?: number;
} {
  return {
    variantIdentityScore: record.variantIdentityScore ?? record.variantFidelityOverall,
    variantFamilyScore: record.variantFamilyScore,
    variantBrandScore: record.variantBrandScore,
    variantShapeMarkerScore: record.variantShapeMarkerScore,
  };
}

function variantAuditExtrasFromDraft(draft: AssetWizardDraft): Pick<
  AssetSemanticRecord,
  | "variantFidelityOverall"
  | "variantIdentityScore"
  | "variantFamilyScore"
  | "variantBrandScore"
  | "variantShapeMarkerScore"
> {
  const audit = draft.variantIdentityAudit;
  return {
    variantFidelityOverall: audit?.identityScore ?? draft.variantFidelityScore?.overall,
    variantIdentityScore: audit?.identityScore,
    variantFamilyScore: audit?.familyScore,
    variantBrandScore: audit?.brandScore,
    variantShapeMarkerScore: audit?.shapeMarkerScore,
  };
}

export function buildAssetSemanticRecordFromWizardDraft(draft: AssetWizardDraft): AssetSemanticRecord | null {
  const sourceName = draft.sourceReferenceName?.trim() || draft.derivationSource?.assetName?.trim();
  const visionAnalysis = draft.sourceVisionAnalysis;
  const animationExtras = animationPreparationExtrasFromDraft(draft);
  if (visionAnalysis) {
    const lineage = resolveSemanticLineageFromDraft(draft);
    return buildAssetSemanticRecordFromVision(visionAnalysis, {
      roleContext: draft.fields.role ?? draft.derivationTransformChoice ?? undefined,
      worldContext: draft.fields.worldProfileId ?? undefined,
      assetFamily: visionAnalysis.assetFamily,
      parentAssetId: lineage.parentAssetId,
      derivedFromAssetId: lineage.derivedFromAssetId,
      sourceReferenceName: sourceName || undefined,
      ...variantAuditExtrasFromDraft(draft),
      identityAssetType: draft.identityAssetType || undefined,
      identityProfile: draft.identityProfileLevel || undefined,
      identityImportance: draft.identityProfileLevel
        ? resolveIdentityImportanceLabel(draft.identityProfileLevel)
        : undefined,
      preserveRules:
        draft.sourceTransformPreserve.trim()
          ? draft.sourceTransformPreserve.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
          : undefined,
      changeRules:
        draft.sourceTransformChange.trim()
          ? draft.sourceTransformChange.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
          : undefined,
      forbiddenRules:
        draft.sourceTransformForbidden.trim()
          ? draft.sourceTransformForbidden.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
          : undefined,
      ...animationExtras,
    });
  }

  if (draft.derivationStyleDna) {
    const lineage = resolveSemanticLineageFromDraft(draft);
    return buildAssetSemanticRecordFromStyleDna(draft.derivationStyleDna, {
      parentAssetId: lineage.parentAssetId,
      derivedFromAssetId: lineage.derivedFromAssetId,
      sourceReferenceName: sourceName || undefined,
      ...variantAuditExtrasFromDraft(draft),
      identityAssetType: draft.identityAssetType || undefined,
      identityProfile: draft.identityProfileLevel || undefined,
      identityImportance: draft.identityProfileLevel
        ? resolveIdentityImportanceLabel(draft.identityProfileLevel)
        : undefined,
      preserveRules: draft.sourceTransformPreserve
        ? draft.sourceTransformPreserve.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
        : undefined,
      changeRules: draft.sourceTransformChange
        ? draft.sourceTransformChange.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
        : undefined,
      forbiddenRules: draft.sourceTransformForbidden
        ? draft.sourceTransformForbidden.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
        : undefined,
      ...animationExtras,
    });
  }

  return null;
}

export function buildAssetSemanticRecordFromStyleDna(
  styleDna: AssetStyleDna,
  extras?: Partial<AssetSemanticRecord>
): AssetSemanticRecord {
  return normalizeAssetSemanticRecord({
    version: ASSET_SEMANTIC_RECORD_VERSION,
    visualStyle: styleDna.visualStyle,
    shapeDna: styleDna.shapeLanguage ? styleDna.shapeLanguage.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [],
    brandIdentity: styleDna.brandIdentity,
    appearanceMemory: [styleDna.visualStyle, styleDna.mascotTraits, styleDna.outfitHints].filter(Boolean).join(". "),
    visualKeywords: [styleDna.colorTheme, styleDna.shapeLanguage].filter(Boolean),
    updatedAt: new Date().toISOString(),
    ...extras,
  });
}

export function extractAssetSemanticRecordFromCharacter(row: {
  referenceNotes?: string | null;
  appearanceMemory?: string | null;
  visualKeywords?: string | null;
  continuityNotes?: string | null;
  role?: string | null;
  worldProfile?: { name?: string | null; visualStyle?: string | null } | null;
}): AssetSemanticRecord {
  const parsed = parseAssetSemanticRecordFromNotes(row.referenceNotes);
  if (parsed.record) {
    return parsed.record;
  }

  return normalizeAssetSemanticRecord({
    version: ASSET_SEMANTIC_RECORD_VERSION,
    appearanceMemory: row.appearanceMemory?.trim() || undefined,
    visualKeywords: row.visualKeywords
      ? row.visualKeywords.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      : undefined,
    continuityNotes: row.continuityNotes?.trim() || undefined,
    roleContext: row.role?.trim() || undefined,
    worldContext: row.worldProfile?.name?.trim() || undefined,
    visualStyle: row.worldProfile?.visualStyle?.trim() || undefined,
  });
}

export function extractAssetSemanticRecordFromProp(row: {
  continuityNotes?: string | null;
  appearanceMemory?: string | null;
  brandingRules?: string | null;
  worldProfile?: { name?: string | null } | null;
}): AssetSemanticRecord {
  const parsed = parseAssetSemanticRecordFromNotes(row.continuityNotes);
  if (parsed.record) {
    return parsed.record;
  }

  return normalizeAssetSemanticRecord({
    version: ASSET_SEMANTIC_RECORD_VERSION,
    appearanceMemory: row.appearanceMemory?.trim() || undefined,
    continuityNotes: row.brandingRules?.trim() || row.continuityNotes?.trim() || undefined,
    brandIdentity: row.brandingRules?.trim() || undefined,
    worldContext: row.worldProfile?.name?.trim() || undefined,
  });
}

export function extractAssetSemanticRecordFromLocation(row: {
  continuityNotes?: string | null;
  worldMemory?: string | null;
  visualIdentity?: string | null;
  environmentKeywords?: string | null;
  worldProfile?: { name?: string | null; visualStyle?: string | null } | null;
}): AssetSemanticRecord {
  const parsed = parseAssetSemanticRecordFromNotes(row.continuityNotes);
  if (parsed.record) {
    return parsed.record;
  }

  return normalizeAssetSemanticRecord({
    version: ASSET_SEMANTIC_RECORD_VERSION,
    appearanceMemory: row.worldMemory?.trim() || undefined,
    visualStyle: row.visualIdentity?.trim() || row.worldProfile?.visualStyle?.trim() || undefined,
    visualKeywords: row.environmentKeywords
      ? row.environmentKeywords.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      : undefined,
    worldContext: row.worldProfile?.name?.trim() || undefined,
  });
}

export function extractAssetSemanticRecordFromWorld(row: {
  continuityRules?: string | null;
  visualStyle?: string | null;
  tone?: string | null;
  description?: string | null;
}): AssetSemanticRecord {
  const parsed = parseAssetSemanticRecordFromNotes(row.continuityRules);
  if (parsed.record) {
    return parsed.record;
  }

  return normalizeAssetSemanticRecord({
    version: ASSET_SEMANTIC_RECORD_VERSION,
    visualStyle: row.visualStyle?.trim() || undefined,
    appearanceMemory: row.description?.trim() || undefined,
    continuityNotes: row.tone?.trim() || undefined,
  });
}

export function applySemanticRecordToCharacterFields(
  record: AssetSemanticRecord,
  current: {
    appearanceMemory?: string;
    visualKeywords?: string;
    continuityNotes?: string;
    referenceNotes?: string;
  }
): { appearanceMemory: string; visualKeywords: string; continuityNotes: string; referenceNotes: string } {
  const { humanNotes } = parseAssetSemanticRecordFromNotes(current.referenceNotes);
  const appearanceMemory =
    record.appearanceMemory?.trim() ||
    current.appearanceMemory?.trim() ||
    [record.visualStyle, record.keyFeatures?.join(", ")].filter(Boolean).join(". ");

  const visualKeywords =
    record.visualKeywords?.join(", ") ||
    current.visualKeywords?.trim() ||
    [
      record.objectType,
      record.visualStyle,
      ...(record.shapeDna ?? []),
      ...(record.primaryColors?.map((c) => c.label) ?? []),
    ]
      .filter(Boolean)
      .join(", ");

  const continuityNotes =
    record.continuityNotes?.trim() ||
    current.continuityNotes?.trim() ||
    record.preserveRules?.join(", ") ||
    "";

  return {
    appearanceMemory,
    visualKeywords,
    continuityNotes,
    referenceNotes: serializeAssetSemanticRecordToNotes(humanNotes, record),
  };
}

export function applySemanticRecordToPropFields(
  record: AssetSemanticRecord,
  current: { appearanceMemory?: string; brandingRules?: string; continuityNotes?: string }
): { appearanceMemory: string; brandingRules: string; continuityNotes: string } {
  const { humanNotes } = parseAssetSemanticRecordFromNotes(current.continuityNotes);
  return {
    appearanceMemory:
      record.appearanceMemory?.trim() || current.appearanceMemory?.trim() || record.visualStyle?.trim() || "",
    brandingRules:
      record.brandIdentity?.trim() || current.brandingRules?.trim() || record.referenceIdentity?.trim() || "",
    continuityNotes: serializeAssetSemanticRecordToNotes(humanNotes, record),
  };
}

export function applySemanticRecordToLocationFields(
  record: AssetSemanticRecord,
  current: {
    worldMemory?: string;
    visualIdentity?: string;
    environmentKeywords?: string;
    continuityNotes?: string;
  }
): {
  worldMemory: string;
  visualIdentity: string;
  environmentKeywords: string;
  continuityNotes: string;
} {
  const { humanNotes } = parseAssetSemanticRecordFromNotes(current.continuityNotes);
  return {
    worldMemory: record.appearanceMemory?.trim() || current.worldMemory?.trim() || "",
    visualIdentity: record.visualStyle?.trim() || current.visualIdentity?.trim() || "",
    environmentKeywords:
      record.visualKeywords?.join(", ") || current.environmentKeywords?.trim() || "",
    continuityNotes: serializeAssetSemanticRecordToNotes(humanNotes, record),
  };
}

export function applySemanticRecordToWorldFields(
  record: AssetSemanticRecord,
  current: { description?: string; visualStyle?: string; tone?: string; continuityRules?: string }
): { description: string; visualStyle: string; tone: string; continuityRules: string } {
  const { humanNotes } = parseAssetSemanticRecordFromNotes(current.continuityRules);
  return {
    description: current.description?.trim() || record.appearanceMemory?.trim() || "",
    visualStyle: record.visualStyle?.trim() || current.visualStyle?.trim() || "",
    tone: current.tone?.trim() || record.continuityNotes?.trim() || "",
    continuityRules: serializeAssetSemanticRecordToNotes(humanNotes, record),
  };
}

export function formatDirectorSemanticAssetLabel(
  name: string,
  record: AssetSemanticRecord | null | undefined
): string {
  if (!record) {
    return name;
  }
  const parts = [name];
  if (record.objectType && record.objectType.toLowerCase() !== name.toLowerCase()) {
    parts.push(record.objectType);
  }
  if (record.assetFamily) {
    parts.push(`Family: ${record.assetFamily}`);
  }
  if (record.brandIdentity) {
    parts.push(`Brand: ${record.brandIdentity}`);
  }
  if (record.identityFingerprint?.fingerprintHash) {
    parts.push(`Fingerprint: ${record.identityFingerprint.fingerprintHash.slice(0, 8)}`);
  } else if (record.identityFingerprint?.faceStructure) {
    parts.push(`Identity: ${record.identityFingerprint.faceStructure}`);
  }
  if (record.shapeDna?.length) {
    parts.push(`Shape: ${record.shapeDna.slice(0, 3).join(", ")}`);
  }
  if (record.visualStyle) {
    parts.push(`Style: ${record.visualStyle}`);
  }
  if (record.sourceReferenceName) {
    parts.push(`Based on: ${record.sourceReferenceName}`);
  }
  const profileLabel = formatIdentityProfileDirectorLabel(record);
  if (profileLabel) {
    parts.push(profileLabel);
  }
  return parts.join(" · ");
}

export function buildSemanticContinuitySnapshot(
  record: AssetSemanticRecord | null | undefined
): import("@/types/studio-media-asset").StudioAssetSemanticContinuity | null {
  if (!record) {
    return null;
  }
  const hasIdentity =
    Boolean(record.brandIdentity?.trim()) ||
    Boolean(record.assetFamily?.trim()) ||
    Boolean(record.identityFingerprint?.fingerprintHash) ||
    Boolean(record.identityProfile) ||
    Boolean(record.identityAssetType);
  if (!hasIdentity) {
    return null;
  }
  return {
    brandIdentity: record.brandIdentity,
    assetFamily: record.assetFamily,
    fingerprintHash: record.identityFingerprint?.fingerprintHash,
    identityScore: record.variantIdentityScore ?? record.variantFidelityOverall,
    familyScore: record.variantFamilyScore,
    brandScore: record.variantBrandScore,
    shapeMarkerScore: record.variantShapeMarkerScore,
    derivedFromSourceName: record.sourceReferenceName,
    derivedFromAssetId: record.derivedFromAssetId ?? record.parentAssetId,
    visionSummary: record.visionSummary,
    identityAssetType: record.identityAssetType,
    identityProfile: record.identityProfile,
    identityImportance: record.identityImportance,
    animationReadinessScore: record.animationReadinessScore,
    characterConstructionSummary: formatCharacterConstructionSummary(record.characterConstructionProfile),
    postureSummary: formatPostureSummary(record.characterConstructionProfile),
    bodySummary: formatBodySummary(record.characterConstructionProfile),
  };
}
