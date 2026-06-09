import { resolveVariantFidelityThresholdsForProfile } from "@/lib/studio-asset-identity-profile";
import {
  extractAssetSemanticRecordFromCharacter,
  extractAssetSemanticRecordFromLocation,
  extractAssetSemanticRecordFromProp,
} from "@/lib/studio-asset-semantic-record";
import { computeVariantFidelityScore } from "@/lib/studio-asset-identity-preservation";
import { extractIdentityShapeMarkers } from "@/lib/studio-asset-identity-shape-markers";
import type { IdentityProfileLevel } from "@/types/studio-asset-identity-profile";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type {
  GeneratedIdentityVariantAudit,
  IdentityAuditItem,
  IdentityScoreBadgeTone,
} from "@/types/studio-asset-identity-variant-audit";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function markerOverlapScore(source: string[], generated: string[]): number {
  if (source.length === 0) {
    return generated.length > 0 ? 70 : 100;
  }
  const setB = new Set(generated.map((m) => m.toLowerCase()));
  let overlap = 0;
  for (const marker of source) {
    const lower = marker.toLowerCase();
    if (
      setB.has(lower) ||
      [...setB].some((g) => g.includes(lower) || lower.includes(g))
    ) {
      overlap += 1;
    }
  }
  return Math.round((overlap / source.length) * 100);
}

function featureDelta(
  sourceFeatures: string[],
  generatedFeatures: string[],
  preserveTerms: RegExp
): { preserved: string[]; lost: string[] } {
  const preserved: string[] = [];
  const lost: string[] = [];
  for (const feature of sourceFeatures) {
    if (!preserveTerms.test(feature)) {
      continue;
    }
    const lower = feature.toLowerCase();
    const found = generatedFeatures.some(
      (g) => g.toLowerCase().includes(lower) || lower.includes(g.toLowerCase())
    );
    if (found) {
      preserved.push(feature);
    } else {
      lost.push(feature);
    }
  }
  return { preserved, lost };
}

export function semanticRecordToVisionAnalysis(
  record: AssetSemanticRecord,
  sourceName?: string
): AssetVisionAnalysis {
  const objectType = (record.objectType as AssetVisionAnalysis["objectType"]) ?? "character";
  const colors = (record.primaryColors ?? []).map((c) => ({
    label: c.label,
    hex: c.hex,
  }));
  return {
    objectType,
    objectTypeLabel: sourceName?.trim() || record.sourceReferenceName?.trim() || objectType,
    visualStyle: record.visualStyle ?? "",
    brandIdentity: record.brandIdentity ?? "",
    assetFamily: record.assetFamily ?? "",
    characterLineage: "unknown",
    colors,
    shapeLanguage: record.shapeDna ?? [],
    keyFeatures: record.keyFeatures ?? [],
    suggestedPreserve: record.preserveRules ?? [],
    suggestedChange: record.changeRules ?? [],
    suggestedForbidden: record.forbiddenRules ?? [],
    identityFingerprint: record.identityFingerprint ?? {},
    materialHints: "",
    environmentHints: "",
    confidence: 0.8,
    safetyNotes: [],
    brandRecognitionConfidence: 0.8,
  };
}

export function resolveSourceVisionForAudit(params: {
  sourceSemanticRecord?: AssetSemanticRecord | null;
  sourceVisionAnalysis?: AssetVisionAnalysis | null;
  sourceName?: string;
}): AssetVisionAnalysis | null {
  if (params.sourceVisionAnalysis) {
    return params.sourceVisionAnalysis;
  }
  if (params.sourceSemanticRecord) {
    return semanticRecordToVisionAnalysis(params.sourceSemanticRecord, params.sourceName);
  }
  return null;
}

export function auditGeneratedIdentityVariant(params: {
  sourceSemanticRecord?: AssetSemanticRecord | null;
  sourceVisionAnalysis?: AssetVisionAnalysis | null;
  generatedVisionAnalysis: AssetVisionAnalysis;
  identityProfile?: IdentityProfileLevel | "";
  identityImportance?: string;
  sourceName?: string;
}): GeneratedIdentityVariantAudit | null {
  const source = resolveSourceVisionForAudit(params);
  if (!source) {
    return null;
  }

  const sourceName =
    params.sourceName?.trim() ||
    params.sourceSemanticRecord?.sourceReferenceName?.trim() ||
    source.objectTypeLabel?.trim() ||
    "Source";

  const fidelity = computeVariantFidelityScore({
    source,
    generated: params.generatedVisionAnalysis,
    profileLevel: params.identityProfile,
  });

  const sourceMarkers = [
    ...extractIdentityShapeMarkers(source),
    ...(source.identityFingerprint.identityShapeMarkers ?? []),
  ];
  const generatedMarkers = [
    ...extractIdentityShapeMarkers(params.generatedVisionAnalysis),
    ...(params.generatedVisionAnalysis.identityFingerprint.identityShapeMarkers ?? []),
  ];
  const shapeMarkerScore = markerOverlapScore(
    [...new Set(sourceMarkers)],
    [...new Set(generatedMarkers)]
  );

  const brandScore = Math.round(
    fidelity.brandPreservation * 0.5 + fidelity.colorPreservation * 0.5
  );
  const familyScore = fidelity.familyPreservation;

  const silhouetteScore = markerOverlapScore(source.shapeLanguage, params.generatedVisionAnalysis.shapeLanguage);
  const faceScore = markerOverlapScore(
    [source.identityFingerprint.faceStructure ?? ""].filter(Boolean),
    [params.generatedVisionAnalysis.identityFingerprint.faceStructure ?? ""].filter(Boolean)
  );

  const identityScore = Math.round(
    fidelity.overall * 0.4 +
      shapeMarkerScore * 0.2 +
      faceScore * 0.15 +
      silhouetteScore * 0.15 +
      fidelity.identityPreservation * 0.1
  );

  const thresholds = resolveVariantFidelityThresholdsForProfile(params.identityProfile);
  const recoveryRequired = identityScore < thresholds.warning;

  const preserved: IdentityAuditItem[] = [];
  const lost: IdentityAuditItem[] = [];
  const warningItems: IdentityAuditItem[] = [];

  if (faceScore >= 70 || fidelity.identityPreservation >= 70) {
    preserved.push({ kind: "preserved", messageKey: "studio.variantQuality.preserved.face" });
  } else {
    lost.push({ kind: "lost", messageKey: "studio.variantQuality.lost.face" });
  }

  if (silhouetteScore >= 70 || fidelity.shapePreservation >= 70) {
    preserved.push({ kind: "preserved", messageKey: "studio.variantQuality.preserved.headShape" });
  } else {
    lost.push({ kind: "lost", messageKey: "studio.variantQuality.lost.headShape" });
  }

  if (fidelity.colorPreservation >= 65) {
    preserved.push({ kind: "preserved", messageKey: "studio.variantQuality.preserved.brandColors" });
  } else {
    lost.push({ kind: "lost", messageKey: "studio.variantQuality.lost.brandColors" });
  }

  if (shapeMarkerScore >= 65) {
    preserved.push({ kind: "preserved", messageKey: "studio.variantQuality.preserved.shapeMarkers" });
  } else {
    lost.push({ kind: "lost", messageKey: "studio.variantQuality.lost.shapeMarkers" });
  }

  if (fidelity.brandPreservation >= 65) {
    preserved.push({ kind: "preserved", messageKey: "studio.variantQuality.preserved.brandIdentity" });
  } else {
    lost.push({ kind: "lost", messageKey: "studio.variantQuality.lost.brandIdentity" });
  }

  const accessoryDelta = featureDelta(
    source.keyFeatures,
    params.generatedVisionAnalysis.keyFeatures,
    /\b(tie|bowtie|bow\s*tie|necktie|stropdas|hat|cap|jacket|coat|outfit|uniform|apron)\b/i
  );
  for (const item of accessoryDelta.lost) {
    lost.push({
      kind: "lost",
      messageKey: "studio.variantQuality.lost.accessory",
      detail: item,
    });
  }

  const outfitChange = fidelity.identityPreservation < thresholds.warning;
  if (outfitChange) {
    warningItems.push({
      kind: "warning",
      messageKey: "studio.variantQuality.warning.outfitChanged",
    });
  }

  for (const marker of sourceMarkers) {
    const found = generatedMarkers.some(
      (g) => g.toLowerCase().includes(marker.toLowerCase()) || marker.toLowerCase().includes(g.toLowerCase())
    );
    if (!found && marker.trim()) {
      warningItems.push({
        kind: "warning",
        messageKey: "studio.variantQuality.warning.markerMissing",
        detail: marker,
      });
    }
  }

  const warnings = warningItems.map((w) => w.detail ?? w.messageKey);
  const recommendations: string[] = [];

  if (recoveryRequired) {
    recommendations.push("studio.variantQuality.recommendation.regenerate");
  }
  if (outfitChange) {
    recommendations.push("studio.variantQuality.recommendation.outfitPreservation");
  }
  if (shapeMarkerScore < thresholds.warning) {
    recommendations.push("studio.variantQuality.recommendation.shapeMarkers");
  }
  if (fidelity.brandPreservation < thresholds.warning) {
    recommendations.push("studio.variantQuality.recommendation.brandLock");
  }

  return {
    identityScore,
    familyScore,
    brandScore,
    shapeMarkerScore,
    warnings,
    recommendations,
    recoveryRequired,
    profileWarningThreshold: thresholds.warning,
    recoveryTier: fidelity.recoveryTier,
    sourceName,
    preserved,
    lost,
    warningItems,
    identityProfile: params.identityProfile,
    identityImportance: params.identityImportance,
  };
}

export function resolveIdentityScoreBadgeTone(
  score: number,
  profileLevel?: IdentityProfileLevel | ""
): IdentityScoreBadgeTone {
  const threshold = resolveVariantFidelityThresholdsForProfile(profileLevel).warning;
  if (score >= threshold) {
    return "green";
  }
  if (score >= threshold - 10) {
    return "orange";
  }
  return "red";
}

export function buildVariantIdentityDirectorWarnings(params: {
  characters: import("@/types/studio-api").StudioCharacterListItem[];
  props: import("@/types/studio-api").StudioPropListItem[];
  locations: import("@/types/studio-api").StudioLocationListItem[];
}): Array<{
  id: string;
  messageKey: string;
  passed: boolean;
  assetName: string;
  kind: "character" | "prop" | "location";
}> {
  const warnings: Array<{
    id: string;
    messageKey: string;
    passed: boolean;
    assetName: string;
    kind: "character" | "prop" | "location";
  }> = [];

  const pushIfLow = (
    id: string,
    name: string,
    kind: "character" | "prop" | "location",
    record: AssetSemanticRecord
  ) => {
    const score = record.variantIdentityScore ?? record.variantFidelityOverall;
    if (typeof score !== "number") {
      return;
    }
    const threshold = resolveVariantFidelityThresholdsForProfile(record.identityProfile).warning;
    if (score < threshold) {
      warnings.push({
        id: `${kind}-${id}-variant-identity`,
        messageKey: "studio.variantQuality.director.warning",
        passed: false,
        assetName: name,
        kind,
      });
    }
  };

  for (const row of params.characters) {
    pushIfLow(row.id ?? "character", row.name ?? "Character", "character", extractAssetSemanticRecordFromCharacter(row));
  }
  for (const row of params.props) {
    pushIfLow(row.id ?? "prop", row.name ?? "Prop", "prop", extractAssetSemanticRecordFromProp(row));
  }
  for (const row of params.locations) {
    pushIfLow(row.id ?? "location", row.name ?? "Location", "location", extractAssetSemanticRecordFromLocation(row));
  }
  return warnings;
}

export function identityScoreBadgeClass(tone: IdentityScoreBadgeTone): string {
  switch (tone) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "orange":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "red":
      return "border-red-200 bg-red-50 text-red-900";
  }
}
