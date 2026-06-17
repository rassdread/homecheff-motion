/**
 * Maps Studio wallet action types to ProviderCostEvent fields for billProviderAction().
 */

import {
  OPENAI_DALLE3_IMAGE_USD,
  OPENAI_VISION_BASE_USD,
  ELEVENLABS_VOICE_CLONE_ESTIMATE_USD,
} from "@/lib/studio-cost-estimates";
import { OPENAI_OCR_ESTIMATE_USD } from "@/server/admin/render-analytics-cost";
import {
  COST_ACTION,
  COST_UNIT,
  UNIT_COST_USD,
} from "@/server/provider-cost/cost-event-types";
import {
  getActionCost,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import type { CostActionType, CostUnitType } from "@/server/provider-cost/cost-event-types";

export type ProviderCostSpec = {
  provider: string;
  costActionType: CostActionType | string;
  unitType: CostUnitType;
  unitsUsed: number;
  unitCostUsd: number;
  userId: string;
  projectId?: string | null;
  relatedJobId?: string | null;
  relatedExportId?: string | null;
  status?: "completed" | "failed";
  isEstimated?: boolean;
  estimateReason?: string | null;
  metadataJson?: Record<string, unknown>;
};

const MUSIC_ESTIMATE_USD = 0.08;
const SFX_ESTIMATE_USD = 0.04;
const REPLICATE_SEGMENT_ESTIMATE_USD = 0.012;
const ASSISTANT_INTERPRET_ESTIMATE_USD = 0.003;

export function defaultProviderCostSpec(input: {
  actionType: StudioActionType | string;
  userId: string;
  projectId?: string | null;
  status?: "completed" | "failed";
  relatedJobId?: string | null;
  unitsUsed?: number;
}): ProviderCostSpec | null {
  const registry = getActionCost(input.actionType);
  if (!registry) {
    return null;
  }

  const status = input.status ?? "completed";
  const base = {
    userId: input.userId,
    projectId: input.projectId ?? null,
    status,
    relatedJobId: input.relatedJobId ?? null,
    isEstimated: true,
    metadataJson: { studioActionType: input.actionType },
  };

  switch (input.actionType as StudioActionType) {
    case "scene_generation":
    case "character_generation":
    case "location_generation":
    case "prop_generation":
    case "world_generation":
    case "image_generation":
    case "image_edit":
      return {
        ...base,
        provider: "openai",
        costActionType: COST_ACTION.OPENAI_SCENE_IMAGE,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: input.unitsUsed ?? 1,
        unitCostUsd: OPENAI_DALLE3_IMAGE_USD,
        estimateReason: "studio_action_registry",
      };
    case "vision_analysis":
    case "ai_analysis":
      return {
        ...base,
        provider: "openai",
        costActionType: COST_ACTION.OPENAI_VISION,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: input.unitsUsed ?? 1,
        unitCostUsd: OPENAI_VISION_BASE_USD,
        estimateReason: "studio_action_registry",
      };
    case "voice_generation":
      return {
        ...base,
        provider: "elevenlabs",
        costActionType: COST_ACTION.ELEVENLABS_TTS,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: input.unitsUsed ?? 1,
        unitCostUsd: registry.reservedCostUsd,
        estimateReason: "studio_action_registry",
      };
    case "voice_clone":
      return {
        ...base,
        provider: "elevenlabs",
        costActionType: COST_ACTION.ELEVENLABS_CLONE,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 1,
        unitCostUsd: ELEVENLABS_VOICE_CLONE_ESTIMATE_USD,
        estimateReason: "studio_action_registry",
      };
    case "subtitle_transcription":
      return {
        ...base,
        provider: "elevenlabs",
        costActionType: COST_ACTION.ELEVENLABS_STT,
        unitType: COST_UNIT.SECONDS,
        unitsUsed: input.unitsUsed ?? 60,
        unitCostUsd: registry.reservedCostUsd / 60,
        estimateReason: "studio_action_registry",
      };
    case "music_generation":
      return {
        ...base,
        provider: "elevenlabs",
        costActionType: COST_ACTION.ELEVENLABS_MUSIC,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 1,
        unitCostUsd: MUSIC_ESTIMATE_USD,
        estimateReason: "studio_action_registry",
      };
    case "sfx_generation":
      return {
        ...base,
        provider: "elevenlabs",
        costActionType: COST_ACTION.ELEVENLABS_SFX,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 1,
        unitCostUsd: SFX_ESTIMATE_USD,
        estimateReason: "studio_action_registry",
      };
    case "ocr_scan":
      return {
        ...base,
        provider: "openai",
        costActionType: COST_ACTION.OPENAI_OCR,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 1,
        unitCostUsd: OPENAI_OCR_ESTIMATE_USD,
        estimateReason: "studio_action_registry",
      };
    case "translation_export":
      return {
        ...base,
        provider: "openai",
        costActionType: COST_ACTION.OPENAI_TRANSLATION,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: input.unitsUsed ?? 1,
        unitCostUsd: registry.reservedCostUsd,
        estimateReason: "studio_action_registry",
      };
    case "transformation_session":
      return {
        ...base,
        provider: "replicate",
        costActionType: COST_ACTION.REPLICATE_SEGMENT,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 1,
        unitCostUsd: REPLICATE_SEGMENT_ESTIMATE_USD,
        estimateReason: "studio_action_registry",
      };
    case "motion_render":
      return {
        ...base,
        provider: "vidu",
        costActionType: COST_ACTION.VIDU_RENDER,
        unitType: COST_UNIT.CREDITS,
        unitsUsed: input.unitsUsed ?? registry.defaultCreditCost,
        unitCostUsd: UNIT_COST_USD.vidu_credit,
        estimateReason: "studio_action_registry",
      };
    case "assistant_interpret":
      return {
        ...base,
        provider: "openai",
        costActionType: COST_ACTION.OPENAI_VISION,
        unitType: COST_UNIT.REQUEST,
        unitsUsed: 1,
        unitCostUsd: ASSISTANT_INTERPRET_ESTIMATE_USD,
        estimateReason: "assistant_interpret_llm",
      };
    default:
      return {
        ...base,
        provider: registry.provider,
        costActionType: mapGenericCostAction(registry.provider),
        unitType: COST_UNIT.REQUEST,
        unitsUsed: input.unitsUsed ?? 1,
        unitCostUsd: registry.actualCostEstimateUsd,
        estimateReason: "studio_action_registry_fallback",
      };
  }
}

function mapGenericCostAction(provider: string): CostActionType {
  if (provider === "elevenlabs") {
    return COST_ACTION.ELEVENLABS_TTS;
  }
  if (provider === "vidu") {
    return COST_ACTION.VIDU_RENDER;
  }
  if (provider === "replicate") {
    return COST_ACTION.REPLICATE_SEGMENT;
  }
  return COST_ACTION.OPENAI_SCENE_IMAGE;
}

export function providerCostUsdFromSpec(spec: ProviderCostSpec): number {
  return Math.round(spec.unitsUsed * spec.unitCostUsd * 10000) / 10000;
}
