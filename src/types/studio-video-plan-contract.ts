/**
 * Video Plan Contract — single source of truth for production economics.
 * User-facing label: "Video Plan"
 */

import type { StudioVideoIntent } from "@/types/studio-video-production";

export type VideoPlanPhaseId = "learning" | "scenes" | "rendering" | "finishing";

export type VideoPlanLineItem = {
  id: string;
  phase: VideoPlanPhaseId;
  /** i18n key for user-facing bullet (no provider names). */
  labelKey: string;
  quantity?: number;
  unitLabelKey?: string;
  credits: number;
  cached?: boolean;
  /** Internal — cost inventory id */
  costInventoryId?: string;
  estimatedCogsUsd?: number;
};

export type VideoPlanContractKind = "initial_production" | "post_production";

export type PostProductionActionType =
  | "voice_over"
  | "subtitle"
  | "translation"
  | "music_replace"
  | "new_export"
  | "new_ending"
  | "add_character"
  | "scene_regen";

/** Allowed studio action types covered by this contract's reservation. */
export type VideoPlanAllowedAction =
  | "motion_render"
  | "scene_generation"
  | "image_generation"
  | "vision_analysis"
  | "ai_analysis"
  | "publish_mp4_export"
  | "publish_slideshow"
  | "publish_photo_story"
  | "publish_voice_message"
  | "voice_generation"
  | "subtitle_transcription"
  | "translation_export"
  | "music_generation"
  | "sfx_generation"
  | "internal_merge";

export type VideoPlanContract = {
  id: string;
  kind: VideoPlanContractKind;
  intent: StudioVideoIntent;
  hcProjectId?: string;
  /** User-facing phases only — no provider names. */
  phases: Array<{
    id: VideoPlanPhaseId;
    titleKey: string;
    items: VideoPlanLineItem[];
    credits: number;
  }>;
  lineItems: VideoPlanLineItem[];
  uploads: {
    photos: number;
    logos: number;
    products: number;
    characters: number;
    audio: number;
    video: number;
  };
  scenes: number;
  batches: number;
  estimatedRetries: number;
  allowedActions: VideoPlanAllowedAction[];
  totalCredits: number;
  estimatedCogsUsd: number;
  targetGrossMargin: number;
  grossMarginAtWorstPack: number;
  cacheSavingsUsd: number;
  createdAt: string;
  /** Post-production only */
  postProductionAction?: PostProductionActionType;
};

export type ProductionLedgerEntry = {
  id: string;
  contractId: string;
  labelKey: string;
  credits: number;
  phase: VideoPlanPhaseId | "post_production";
  reservationId?: string;
  captured: boolean;
  refunded: boolean;
  providerCostEventIds: string[];
  createdAt: string;
};

export type ProductionProjectLedger = {
  hcProjectId: string;
  entries: ProductionLedgerEntry[];
  totalCredits: number;
  updatedAt: string;
};

export const VIDEO_PLAN_PHASE_KEYS: Record<VideoPlanPhaseId, string> = {
  learning: "studio.orchestrator.cost.learning",
  scenes: "studio.orchestrator.cost.creatingScenes",
  rendering: "studio.orchestrator.cost.renderingVideo",
  finishing: "studio.orchestrator.cost.finishingVideo",
};

export const DEFAULT_INITIAL_ALLOWED_ACTIONS: VideoPlanAllowedAction[] = [
  "motion_render",
  "scene_generation",
  "image_generation",
  "vision_analysis",
  "ai_analysis",
  "publish_mp4_export",
  "publish_slideshow",
  "publish_photo_story",
  "internal_merge",
];

export function sumPhaseCredits(
  items: VideoPlanLineItem[],
  phase: VideoPlanPhaseId
): number {
  return items.filter((i) => i.phase === phase).reduce((s, i) => s + i.credits, 0);
}

export function contractCoversAction(
  contract: VideoPlanContract | undefined,
  actionType: string
): boolean {
  if (!contract) return false;
  return contract.allowedActions.includes(actionType as VideoPlanAllowedAction);
}
