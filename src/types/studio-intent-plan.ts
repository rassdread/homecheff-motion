/**
 * Thin IntentPlan contract for AI-first Studio home.
 * Orchestration only — does not replace generation, billing, or project models.
 */

import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { StudioVideoIntent } from "@/types/studio-video-production";

export type StudioIntentPlanSource = "text" | "image" | "video" | "mixed" | "unknown";
export type StudioIntentPlanTarget = "image" | "video" | "edit" | "character" | "unknown";
export type StudioIntentPlanPurpose =
  | "create"
  | "edit"
  | "advertisement"
  | "social"
  | "animation"
  | "story"
  | "product"
  | "brand"
  | "unknown";

/** Existing Studio entry pipelines — no new generators. */
export type StudioIntentRecommendedPipeline =
  | "photo_video"
  | "editor"
  | "experience"
  | "motion"
  | "orchestrator"
  | "quick_ad"
  | "character_new"
  | "character_from_reference";

export type StudioIntentPlanAttachmentKind = "media" | "character" | "product" | "brand";

export type StudioIntentPlanAttachment = {
  kind: StudioIntentPlanAttachmentKind;
  id: string;
  name: string;
  url?: string | null;
};

export type StudioIntentPlanConfidence = "high" | "medium" | "low";

export type StudioIntentPlan = {
  version: 1;
  originalPrompt: string;
  summary: string;
  source: StudioIntentPlanSource;
  target: StudioIntentPlanTarget;
  purpose: StudioIntentPlanPurpose;
  format?: string | null;
  durationSeconds?: number | null;
  aspectRatio?: string | null;
  style?: string | null;
  audio?: "optional" | "required" | "none" | null;
  textOverlays?: "optional" | "probable" | "none" | null;
  attachments: StudioIntentPlanAttachment[];
  characterIds: string[];
  productIds: string[];
  brandKitIds: string[];
  experienceId?: StudioProductExperienceId | null;
  videoIntent?: StudioVideoIntent | null;
  assistantActionId?: AssistantActionId | "unknown" | null;
  recommendedPipeline: StudioIntentRecommendedPipeline;
  /** Studio action type for /api/me/studio-credits/preview — null when free. */
  billingActionType: string | null;
  estimatedCredits: number | null;
  free: boolean;
  confidence: StudioIntentPlanConfidence;
  missingRequired: string[];
  missingQuestionKey?: string | null;
  handoffHref: string;
  keepCharacterConsistent: boolean;
  inspirationId?: string | null;
};
