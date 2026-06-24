/**
 * Single billing chain — one production, one reservation, one capture.
 */

import type { ProductionTransaction, StudioWorkflowReservation } from "@/types/studio-video-production";
import { createStudioWorkflowTransactionId } from "@/lib/studio-analysis-planner";

export const PRODUCTION_TRANSACTION_HEADER = "x-production-transaction-id";

export function createProductionTransactionFromReservation(params: {
  reservation: StudioWorkflowReservation;
  contractId?: string;
  mergeCredits?: number;
  audioCredits?: number;
  finishingCredits?: number;
}): ProductionTransaction {
  return {
    id: createStudioWorkflowTransactionId(),
    reservationId: params.reservation.reservationId,
    contractId: params.contractId,
    hcProjectId: params.reservation.hcProjectId,
    intent: params.reservation.intent,
    phase: params.reservation.phase,
    analysisCredits: params.reservation.analysisCredits,
    renderCredits: params.reservation.renderCredits,
    publishCredits: params.reservation.publishCredits,
    mergeCredits: params.mergeCredits ?? 0,
    audioCredits: params.audioCredits ?? 0,
    finishingCredits: params.finishingCredits ?? params.reservation.publishCredits,
    totalCredits: params.reservation.totalCredits,
    captured: false,
    refunded: false,
    providerCostEventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function isActiveProductionTransaction(tx: ProductionTransaction | undefined): boolean {
  if (!tx) return false;
  if (tx.refunded || tx.captured) return false;
  return tx.phase !== "failed" && tx.phase !== "refunded" && tx.phase !== "completed";
}

export function productionTransactionCoversAction(
  tx: ProductionTransaction | undefined,
  actionType: string
): boolean {
  if (!isActiveProductionTransaction(tx)) return false;
  const covered = new Set([
    "motion_render",
    "scene_generation",
    "image_generation",
    "publish_mp4_export",
    "publish_slideshow",
    "publish_photo_story",
    "publish_voice_message",
    "ai_analysis",
    "vision_analysis",
    "voice_generation",
    "subtitle_transcription",
    "translation_export",
    "music_generation",
    "sfx_generation",
    "internal_merge",
  ]);
  return covered.has(actionType);
}

export function patchProductionTransaction(
  tx: ProductionTransaction,
  patch: Partial<ProductionTransaction>
): ProductionTransaction {
  return { ...tx, ...patch, updatedAt: new Date().toISOString() };
}
