/**
 * Production payload size audit — measure serialized transport payloads.
 */

import {
  assertStudioJsonWithinSizeLimit,
  STUDIO_HANDOFF_JSON_MAX_BYTES,
} from "@/lib/studio-motion-handoff-storage";

/** Matches studio-project-metadata INTELLIGENCE_JSON_MAX_BYTES */
const INTELLIGENCE_JSON_MAX_BYTES = 250_000;
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";

export type PayloadFieldSize = {
  field: string;
  bytes: number;
};

export type ProductionPayloadSizeReport = {
  label: string;
  totalBytes: number;
  fields: PayloadFieldSize[];
  withinLimits: boolean;
  violations: string[];
};

function serializedBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function topLevelFieldSizes(value: Record<string, unknown>): PayloadFieldSize[] {
  return Object.entries(value)
    .map(([field, entry]) => ({ field, bytes: serializedBytes(entry) }))
    .sort((a, b) => b.bytes - a.bytes);
}

export function measureProductionPayloadReport(
  label: string,
  payload: InstantPremiumCreatePayload
): ProductionPayloadSizeReport {
  const raw = payload as unknown as Record<string, unknown>;
  const fields = topLevelFieldSizes(raw);
  const totalBytes = serializedBytes(payload);
  const violations: string[] = [];

  const studioImport = payload.studioImport;
  if (studioImport) {
    const handoffCheck = studioImport.handoff
      ? assertStudioJsonWithinSizeLimit("studioHandoff", studioImport.handoff, STUDIO_HANDOFF_JSON_MAX_BYTES)
      : { ok: true as const };
    if (!handoffCheck.ok) violations.push(handoffCheck.error);

    const intelCheck = assertStudioJsonWithinSizeLimit(
      "studioIntelligence",
      studioImport.intelligence,
      INTELLIGENCE_JSON_MAX_BYTES
    );
    if (!intelCheck.ok) violations.push(intelCheck.error);
  }

  if (totalBytes > 500_000) {
    violations.push(`batchRenderPayload exceeds 500000 bytes (${totalBytes}).`);
  }

  return {
    label,
    totalBytes,
    fields,
    withinLimits: violations.length === 0,
    violations,
  };
}

export function logProductionPayloadReport(report: ProductionPayloadSizeReport): void {
  console.info("[production-payload-size]", {
    label: report.label,
    totalBytes: report.totalBytes,
    withinLimits: report.withinLimits,
    topFields: report.fields.slice(0, 8),
    violations: report.violations,
  });
}
