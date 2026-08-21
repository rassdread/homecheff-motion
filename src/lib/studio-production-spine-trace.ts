/**
 * S2A — Sanitized production-spine traces (IDs only, no signed URLs).
 */

import type { ProductionInstructions, ProductionPromptSectionId, UnifiedProductionContext } from "@/types/studio-unified-production-context";
import { getUpcScene } from "@/lib/studio-unified-production-context";

export type ProductionSpineTrace = {
  upcVersion: string;
  upcHash: string;
  sceneId: string;
  sceneContextHash: string;
  characterIds: string[];
  locationId: string | null;
  propIds: string[];
  continuityNotes: string[];
  promptVersion: string;
  providerMode: string;
  referenceAccounting: ProductionInstructions["referenceAccounting"];
  droppedSectionIds: string[];
  contextStale: boolean;
};

export function buildProductionSpineTrace(params: {
  upc: UnifiedProductionContext;
  instructions: ProductionInstructions;
  storedUpcHash?: string | null;
}): ProductionSpineTrace {
  const scene = getUpcScene(params.upc, params.instructions.sceneId);
  const assembledIds = new Set(params.instructions.sections.map((s) => s.id));
  const allIds: ProductionPromptSectionId[] = [
    "safety",
    "identity",
    "product",
    "user_override",
    "continuity",
    "action",
    "location",
    "camera",
    "style",
    "polish",
  ];
  return {
    upcVersion: params.upc.version,
    upcHash: params.upc.upcHash,
    sceneId: params.instructions.sceneId,
    sceneContextHash: params.instructions.sceneContextHash,
    characterIds: scene?.characterIds ?? [],
    locationId: scene?.locationId ?? null,
    propIds: scene?.propIds ?? [],
    continuityNotes: scene?.continuity.enteringNotes ?? [],
    promptVersion: params.instructions.orchestratorVersion,
    providerMode: params.instructions.providerMode,
    referenceAccounting: params.instructions.referenceAccounting,
    droppedSectionIds: allIds.filter((id) => !assembledIds.has(id)),
    contextStale: Boolean(params.storedUpcHash && params.storedUpcHash !== params.upc.upcHash),
  };
}

export function redactProductionTraceForLog(trace: ProductionSpineTrace): Record<string, unknown> {
  return {
    upcHash: trace.upcHash,
    sceneId: trace.sceneId,
    sceneContextHash: trace.sceneContextHash,
    characterCount: trace.characterIds.length,
    hasLocation: Boolean(trace.locationId),
    propCount: trace.propIds.length,
    providerMode: trace.providerMode,
    unsupportedRefs: trace.referenceAccounting.filter((row) => row.accounting !== "used").length,
    contextStale: trace.contextStale,
  };
}
