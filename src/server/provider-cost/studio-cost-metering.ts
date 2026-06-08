/**
 * Studio provider cost instrumentation — writes ProviderCostEvent rows only.
 * No billing sync, no UX changes, no monetization.
 */

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  estimateElevenLabsSttCostUsd,
  estimateElevenLabsTtsCostUsd,
  estimateOpenAiVisionCostUsd,
  OPENAI_DALLE3_IMAGE_USD,
} from "@/lib/studio-cost-estimates";
import {
  COST_ACTION,
  COST_UNIT,
  UNIT_COST_USD,
} from "@/server/provider-cost/cost-event-types";
import { recordCostEvent } from "@/server/provider-cost/provider-cost-event";

export type StudioCostFeature =
  | "scene_image_generate"
  | "scene_image_regenerate"
  | "scene_image_regenerate_corrections"
  | "scene_image_bulk"
  | "asset_reference_generate"
  | "asset_derivation"
  | "vision_scene_qa"
  | "vision_storyboard"
  | "character_reference_analysis"
  | "voice_preview_character"
  | "voice_preview_draft"
  | "voice_preview_persona"
  | "voice_preview_cache_hit"
  | "voice_narration"
  | "voice_narration_multi"
  | "voice_clone"
  | "voice_transcribe"
  | "language_translation";

export type StudioMeteringContext = {
  userId: string;
  storyboardId?: string | null;
  sceneId?: string | null;
  projectId?: string | null;
  feature: StudioCostFeature;
  relatedJobId?: string | null;
};

export function buildVoicePreviewDedupHash(params: {
  voiceId: string;
  previewText: string;
  language: string;
  modelId: string;
}): string {
  const normalized = [
    params.voiceId.trim().toLowerCase(),
    params.previewText.trim(),
    params.language.trim().toLowerCase().slice(0, 2),
    params.modelId.trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

function baseMetadata(
  ctx: StudioMeteringContext,
  extra?: Record<string, unknown>
): Prisma.InputJsonValue {
  return {
    feature: ctx.feature,
    storyboardId: ctx.storyboardId ?? undefined,
    sceneId: ctx.sceneId ?? undefined,
    ...extra,
  } as Prisma.InputJsonValue;
}

/** Fire-and-forget — never block user flows on metering failures. */
function safeRecord(fn: () => Promise<void>): void {
  fn().catch((err) => {
    console.error("[studio-cost-metering]", err);
  });
}

export function meterOpenAiSceneImage(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  imageCount?: number;
  model?: string;
  size?: string;
  imageRecordId?: string;
  providerId?: string;
}): void {
  if (params.providerId && params.providerId !== "openai") {
    return;
  }
  const count = Math.max(1, params.imageCount ?? 1);
  const unitCost = OPENAI_DALLE3_IMAGE_USD;
  safeRecord(() =>
    recordCostEvent({
      provider: "openai",
      actionType: COST_ACTION.OPENAI_SCENE_IMAGE,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      relatedJobId: params.imageRecordId ?? params.ctx.relatedJobId,
      status: params.status,
      unitType: COST_UNIT.REQUEST,
      unitsUsed: count,
      unitCostUsd: unitCost,
      isEstimated: true,
      estimateReason: "openai_dalle3_published_per_image",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        model: params.model,
        size: params.size,
        imageCount: count,
        estimatedCostUsd: count * unitCost,
      }),
    })
  );
}

export function meterOpenAiVision(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  imageCount: number;
  model?: string;
  providerId?: string;
  relatedJobId?: string;
}): void {
  if (params.providerId && params.providerId !== "openai") {
    return;
  }
  const estimatedCostUsd = estimateOpenAiVisionCostUsd(params.imageCount);
  const unitCost = estimatedCostUsd;
  safeRecord(() =>
    recordCostEvent({
      provider: "openai",
      actionType: COST_ACTION.OPENAI_VISION,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      relatedJobId: params.relatedJobId ?? params.ctx.relatedJobId,
      status: params.status,
      unitType: COST_UNIT.REQUEST,
      unitsUsed: 1,
      unitCostUsd: unitCost,
      isEstimated: true,
      estimateReason: "openai_vision_flat_per_call",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        model: params.model,
        imageCount: params.imageCount,
        estimatedCostUsd,
      }),
    })
  );
}

export function meterOpenAiCharacterAnalysis(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  imageCount: number;
  model?: string;
}): void {
  const estimatedCostUsd = estimateOpenAiVisionCostUsd(params.imageCount);
  safeRecord(() =>
    recordCostEvent({
      provider: "openai",
      actionType: COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      status: params.status,
      unitType: COST_UNIT.REQUEST,
      unitsUsed: 1,
      unitCostUsd: estimatedCostUsd,
      isEstimated: true,
      estimateReason: "openai_character_vision_estimate",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        model: params.model,
        imageCount: params.imageCount,
        estimatedCostUsd,
      }),
    })
  );
}

export function meterOpenAiTranslation(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  tokenCount?: number;
  projectId: string;
  exportId?: string;
}): void {
  const tokens = Math.max(1, params.tokenCount ?? 1);
  const unitCost = tokens * 0.000002;
  safeRecord(() =>
    recordCostEvent({
      provider: "openai",
      actionType: COST_ACTION.OPENAI_TRANSLATION,
      projectId: params.projectId,
      userId: params.ctx.userId,
      relatedExportId: params.exportId,
      status: params.status,
      unitType: COST_UNIT.TOKENS,
      unitsUsed: tokens,
      unitCostUsd: unitCost / tokens,
      isEstimated: true,
      estimateReason: "openai_translation_token_heuristic",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        tokenCount: tokens,
        estimatedCostUsd: unitCost,
      }),
    })
  );
}

export function meterElevenLabsTts(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  providerId: string;
  voiceId: string;
  characterCount: number;
  modelId: string;
  language: string;
  previewText?: string;
}): void {
  if (params.providerId !== "elevenlabs") {
    return;
  }
  const estimatedCostUsd = estimateElevenLabsTtsCostUsd({
    characterCount: params.characterCount,
    modelId: params.modelId,
  });
  const perChar =
    params.characterCount > 0 ? estimatedCostUsd / params.characterCount : estimatedCostUsd;
  const previewDedupHash =
    params.previewText != null
      ? buildVoicePreviewDedupHash({
          voiceId: params.voiceId,
          previewText: params.previewText,
          language: params.language,
          modelId: params.modelId,
        })
      : undefined;

  safeRecord(() =>
    recordCostEvent({
      provider: "elevenlabs",
      actionType: COST_ACTION.ELEVENLABS_TTS,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      relatedJobId: params.ctx.relatedJobId,
      status: params.status,
      unitType: COST_UNIT.REQUEST,
      unitsUsed: Math.max(1, params.characterCount),
      unitCostUsd: perChar,
      isEstimated: true,
      estimateReason: "elevenlabs_tts_per_character_api_pricing",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        voiceId: params.voiceId,
        characterCount: params.characterCount,
        modelId: params.modelId,
        language: params.language,
        estimatedCostUsd,
        previewDedupHash,
        previewTextLength: params.previewText?.length,
        cacheHit: false,
      }),
    })
  );
}

export function meterVoicePreviewCacheHit(params: {
  ctx: StudioMeteringContext;
  voiceId: string;
  previewDedupHash: string;
  previewType: string;
  language: string;
  modelId: string;
  estimatedCostSavedUsd: number;
  previewTextLength?: number;
}): void {
  safeRecord(() =>
    recordCostEvent({
      provider: "cache",
      actionType: COST_ACTION.VOICE_PREVIEW_CACHE_HIT,
      userId: params.ctx.userId,
      relatedJobId: params.ctx.relatedJobId,
      status: "completed",
      unitType: COST_UNIT.REQUEST,
      unitsUsed: 1,
      unitCostUsd: 0,
      isEstimated: true,
      estimateReason: "voice_preview_blob_cache_hit",
      skipBillingSync: true,
      metadataJson: baseMetadata(
        { ...params.ctx, feature: "voice_preview_cache_hit" },
        {
          cacheHit: true,
          voiceId: params.voiceId,
          previewDedupHash: params.previewDedupHash,
          previewType: params.previewType,
          language: params.language,
          modelId: params.modelId,
          estimatedCostSavedUsd: params.estimatedCostSavedUsd,
          previewTextLength: params.previewTextLength,
        }
      ),
    })
  );
}

export function meterElevenLabsStt(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  providerId: string;
  durationSeconds: number;
  modelId: string;
}): void {
  if (params.providerId !== "elevenlabs") {
    return;
  }
  const estimatedCostUsd = estimateElevenLabsSttCostUsd(params.durationSeconds);
  safeRecord(() =>
    recordCostEvent({
      provider: "elevenlabs",
      actionType: COST_ACTION.ELEVENLABS_STT,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      relatedJobId: params.ctx.relatedJobId,
      status: params.status,
      unitType: COST_UNIT.SECONDS,
      unitsUsed: Math.max(0.1, params.durationSeconds),
      unitCostUsd: estimatedCostUsd / Math.max(0.1, params.durationSeconds),
      isEstimated: true,
      estimateReason: "elevenlabs_stt_per_minute_estimate",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        modelId: params.modelId,
        durationSeconds: params.durationSeconds,
        estimatedCostUsd,
      }),
    })
  );
}

export function meterElevenLabsClone(params: {
  ctx: StudioMeteringContext;
  status: "completed" | "failed";
  providerId: string;
  providerVoiceId?: string;
}): void {
  if (params.providerId !== "elevenlabs") {
    return;
  }
  const unitCost = UNIT_COST_USD.elevenlabs_clone_call;
  safeRecord(() =>
    recordCostEvent({
      provider: "elevenlabs",
      actionType: COST_ACTION.ELEVENLABS_CLONE,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      status: params.status,
      unitType: COST_UNIT.REQUEST,
      unitsUsed: 1,
      unitCostUsd: unitCost,
      isEstimated: true,
      estimateReason: "elevenlabs_clone_no_flat_api_price",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        providerVoiceId: params.providerVoiceId,
        estimatedCostUsd: unitCost,
      }),
    })
  );
}

export function meterAssetDerivation(params: {
  ctx: StudioMeteringContext;
  phase: "vision" | "generate" | "accept";
  status: "completed" | "failed";
  sourceKind?: string;
  targetKind?: string;
  sourceAssetId?: string | null;
  sourceAssetName?: string;
  imageCount?: number;
  model?: string;
  derivationAccepted?: boolean;
}): void {
  const actionType =
    params.phase === "vision" ? COST_ACTION.OPENAI_CHARACTER_ANALYSIS : COST_ACTION.OPENAI_SCENE_IMAGE;
  const unitCost =
    params.phase === "vision"
      ? estimateOpenAiVisionCostUsd(params.imageCount ?? 1)
      : params.phase === "generate"
        ? OPENAI_DALLE3_IMAGE_USD
        : 0;

  if (params.phase === "accept" && params.status === "completed") {
    safeRecord(() =>
      recordCostEvent({
        provider: "internal",
        actionType: COST_ACTION.INTERNAL_MERGE,
        projectId: params.ctx.projectId,
        userId: params.ctx.userId,
        relatedJobId: params.ctx.relatedJobId,
        status: "completed",
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 0,
        unitCostUsd: 0,
        isEstimated: false,
        skipBillingSync: true,
        metadataJson: baseMetadata(params.ctx, {
          derivationPhase: params.phase,
          derivationAccepted: true,
          sourceKind: params.sourceKind,
          targetKind: params.targetKind,
          sourceAssetId: params.sourceAssetId ?? undefined,
          sourceAssetName: params.sourceAssetName,
          derivationJobId: params.ctx.relatedJobId,
        }),
      })
    );
    return;
  }

  if (params.phase === "accept") {
    return;
  }

  safeRecord(() =>
    recordCostEvent({
      provider: "openai",
      actionType,
      projectId: params.ctx.projectId,
      userId: params.ctx.userId,
      relatedJobId: params.ctx.relatedJobId,
      status: params.status,
      unitType: COST_UNIT.REQUEST,
      unitsUsed: 1,
      unitCostUsd: unitCost,
      isEstimated: true,
      estimateReason:
        params.phase === "vision" ? "asset_derivation_vision" : "asset_derivation_generate",
      skipBillingSync: true,
      metadataJson: baseMetadata(params.ctx, {
        derivationPhase: params.phase,
        derivationAccepted: params.derivationAccepted ?? false,
        sourceKind: params.sourceKind,
        targetKind: params.targetKind,
        sourceAssetId: params.sourceAssetId ?? undefined,
        sourceAssetName: params.sourceAssetName,
        derivationJobId: params.ctx.relatedJobId,
        model: params.model,
        imageCount: params.imageCount,
        estimatedCostUsd: unitCost,
      }),
    })
  );
}
