/**
 * Sprint FQ11 — Fusion Quality Score (0–100) from coverage audits.
 */

import type {
  FusionBrandingCoverageReport,
  FusionCharacterConsistencyReport,
  FusionPromptCoverageReport,
  FusionProviderPayloadCoverageReport,
  FusionQualityScore,
  FusionQualityScoreBreakdown,
  FusionSourceCoverageReport,
} from "@/types/fusion-intelligence-audit";
import type { FusionBlueprintAudit } from "@/types/fusion-intelligence-audit";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeVisionCoverageFromSources(report: FusionSourceCoverageReport): number {
  if (report.sources.length === 0) {
    return 0;
  }
  const populated = report.sources.filter((row) => row.populated).length;
  const used = report.sources.filter((row) => row.usedAt.length > 0).length;
  const lost = report.sources.filter((row) => row.lostAt.length > 0).length;
  const base = (populated / report.sources.length) * 55 + (used / report.sources.length) * 45;
  return clampScore(base - lost * 3);
}

export function computeBlueprintCoverage(audit: FusionBlueprintAudit): number {
  const total = audit.traitAssignmentCount + audit.neverPopulatedFields.length;
  if (total === 0) {
    return 0;
  }
  const filledRatio = audit.filledFields.length / Math.max(audit.filledFields.length + audit.neverPopulatedFields.length, 1);
  const enrichedRatio =
    audit.traitAssignmentCount > 0 ? audit.enrichedTraitCount / audit.traitAssignmentCount : 0;
  const unusedPenalty = audit.unusedFilledFields.length * 4;
  return clampScore(filledRatio * 50 + enrichedRatio * 50 - unusedPenalty);
}

export function computeFusionQualityScore(input: {
  workflow: EditorFusionIntent;
  sourceCoverage: FusionSourceCoverageReport;
  promptCoverage: FusionPromptCoverageReport;
  blueprintAudit: FusionBlueprintAudit;
  providerPayload: FusionProviderPayloadCoverageReport;
  brandingCoverage: FusionBrandingCoverageReport;
  characterConsistency: FusionCharacterConsistencyReport;
}): FusionQualityScore {
  const breakdown: FusionQualityScoreBreakdown = {
    visionCoverage: computeVisionCoverageFromSources(input.sourceCoverage),
    promptCoverage: clampScore(input.promptCoverage.promptCoveragePercent),
    blueprintCoverage: computeBlueprintCoverage(input.blueprintAudit),
    providerCoverage: clampScore(input.providerPayload.coveragePercent),
    brandCoverage: clampScore(input.brandingCoverage.coveragePercent),
    characterCoverage: clampScore(input.characterConsistency.coveragePercent),
  };

  const totalFusionQualityScore = clampScore(
    breakdown.visionCoverage * 0.2 +
      breakdown.promptCoverage * 0.2 +
      breakdown.blueprintCoverage * 0.15 +
      breakdown.providerCoverage * 0.2 +
      breakdown.brandCoverage * 0.1 +
      breakdown.characterCoverage * 0.15
  );

  return {
    workflow: input.workflow,
    totalFusionQualityScore,
    breakdown,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFusionDiagnosticExport(score: FusionQualityScore): {
  workflow: EditorFusionIntent;
  analysisCoverage: number;
  blueprintCoverage: number;
  promptCoverage: number;
  providerCoverage: number;
  characterCoverage: number;
  brandingCoverage: number;
  totalFusionQualityScore: number;
  generatedAt: string;
} {
  return {
    workflow: score.workflow,
    analysisCoverage: score.breakdown.visionCoverage,
    blueprintCoverage: score.breakdown.blueprintCoverage,
    promptCoverage: score.breakdown.promptCoverage,
    providerCoverage: score.breakdown.providerCoverage,
    characterCoverage: score.breakdown.characterCoverage,
    brandingCoverage: score.breakdown.brandCoverage,
    totalFusionQualityScore: score.totalFusionQualityScore,
    generatedAt: score.generatedAt,
  };
}
