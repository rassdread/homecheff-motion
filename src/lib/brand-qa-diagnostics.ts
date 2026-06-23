/**
 * Sprint J — Brand QA diagnostic harness (reads existing Motion Lock data only).
 */

import {
  aggregateBrandQaReports,
  loadBrandQaSourceRecords,
} from "@/lib/brand-qa-analytics";
import { recommendForSurface, recommendForWorkflow } from "@/lib/brand-qa-recommendation-engine";
import type {
  BrandQaDiagnosticInput,
  BrandQaDiagnosticResult,
} from "@/types/brand-qa-analytics";

export function runBrandQaDiagnostics(
  records: Awaited<ReturnType<typeof loadBrandQaSourceRecords>>,
  input: BrandQaDiagnosticInput
): BrandQaDiagnosticResult {
  const workflowType = input.workflowType?.trim() || "logo_placement";
  const surfaceType = input.surfaceType?.trim() || "billboard";
  const sampleCount = Math.max(1, input.sampleCount ?? 100);

  const filtered = records.filter((record) => {
    const workflowMatch =
      !input.workflowType ||
      record.workflowType === workflowType ||
      record.metrics?.workflowType === workflowType;
    const surfaceMatch =
      !input.surfaceType ||
      record.brandLockedAssets.some((asset) => asset.surfaceType === surfaceType) ||
      (surfaceType === "mascot_emblem" &&
        record.brandLockedAssets.some((asset) => asset.preserveMode === "reference_asset"));
    return workflowMatch && surfaceMatch;
  });

  const slice = filtered.slice(0, sampleCount);
  const aggregate = aggregateBrandQaReports(slice);

  const workflowRow = aggregate.workflowBreakdown[workflowType];
  const surfaceRow = aggregate.surfaceTypeBreakdown[surfaceType];

  const segmentsChecked = aggregate.segmentsChecked;
  const segmentsPassed = slice.reduce(
    (sum, record) => sum + (record.metrics?.segmentsPassed ?? 0),
    0
  );
  const passRate = segmentsChecked > 0 ? segmentsPassed / segmentsChecked : 1;
  const correctionRate = workflowRow?.correctionRate ?? aggregate.overallCorrectionRate;

  const recommendation =
    surfaceRow?.recommendation ??
    workflowRow?.recommendation ??
  recommendForWorkflow(workflowType, correctionRate);

  return {
    workflowType,
    surfaceType,
    sampleCount: slice.length,
    passRate,
    correctionRate,
    recommendation:
      input.surfaceType && surfaceRow
        ? recommendForSurface(surfaceType, surfaceRow.correctionRate)
        : recommendation,
  };
}

export async function loadBrandQaDiagnosticResult(
  input: BrandQaDiagnosticInput
): Promise<BrandQaDiagnosticResult> {
  const records = await loadBrandQaSourceRecords(input.sampleCount ?? 3000);
  return runBrandQaDiagnostics(records, input);
}
