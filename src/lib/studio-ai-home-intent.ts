/**
 * AI-first Studio home — IntentPlan builder over existing routers/pipelines.
 * No parallel generation architecture.
 */

import { getAssistantAction, type AssistantActionId } from "@/lib/assistant-action-registry";
import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";
import { matchAssistantIntent } from "@/lib/assistant-intent-router";
import { detectStudioVideoIntent, buildStudioStartHref } from "@/lib/studio-video-intents";
import {
  inspirationExperienceHref,
  studioAiHomeInspiration,
  type StudioAiHomeInspirationId,
} from "@/lib/studio-ai-home-inspiration";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type {
  StudioIntentPlan,
  StudioIntentPlanAttachment,
  StudioIntentPlanConfidence,
  StudioIntentPlanPurpose,
  StudioIntentPlanSource,
  StudioIntentPlanTarget,
  StudioIntentRecommendedPipeline,
} from "@/types/studio-intent-plan";
import type { StudioVideoIntent } from "@/types/studio-video-production";

export type BuildStudioAiHomeIntentInput = {
  prompt: string;
  attachments?: StudioIntentPlanAttachment[];
  inspirationId?: StudioAiHomeInspirationId | null;
  interpretation?: AssistantInterpretation | null;
  locale?: "nl" | "en";
};

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectDurationSeconds(text: string): number | null {
  const match = text.match(/\b(\d{1,3})\s*(s|sec|secs|second|seconds|seconde|seconden)\b/i);
  if (match?.[1]) {
    const n = Number(match[1]);
    return Number.isFinite(n) ? Math.min(180, Math.max(1, n)) : null;
  }
  if (includesAny(text, ["15 seconden", "15 seconds", "15s"])) return 15;
  return null;
}

function detectAspectRatio(text: string): string | null {
  if (includesAny(text, ["9:16", "verticaal", "vertical", "reels", "tiktok", "shorts", "stories"])) {
    return "9:16";
  }
  if (includesAny(text, ["16:9", "horizontaal", "horizontal", "youtube", "widescreen"])) {
    return "16:9";
  }
  if (includesAny(text, ["1:1", "vierkant", "square"])) return "1:1";
  return null;
}

function detectFormat(text: string): string | null {
  if (includesAny(text, ["instagram", "reels"])) return "instagram_reels";
  if (includesAny(text, ["tiktok"])) return "tiktok";
  if (includesAny(text, ["youtube shorts", "shorts"])) return "youtube_shorts";
  if (includesAny(text, ["linkedin"])) return "linkedin";
  return null;
}

function hasMedia(attachments: StudioIntentPlanAttachment[]): boolean {
  return attachments.some((a) => a.kind === "media" && Boolean(a.url));
}

function characterAttachments(attachments: StudioIntentPlanAttachment[]) {
  return attachments.filter((a) => a.kind === "character");
}

function productAttachments(attachments: StudioIntentPlanAttachment[]) {
  return attachments.filter((a) => a.kind === "product");
}

function brandAttachments(attachments: StudioIntentPlanAttachment[]) {
  return attachments.filter((a) => a.kind === "brand");
}

function inferSource(
  text: string,
  attachments: StudioIntentPlanAttachment[]
): StudioIntentPlanSource {
  const media = attachments.filter((a) => a.kind === "media");
  const hasImage = media.some((m) => !m.url?.match(/\.(mp4|webm|mov)(\?|$)/i));
  const hasVideo = media.some((m) => m.url?.match(/\.(mp4|webm|mov)(\?|$)/i));
  if (hasImage && hasVideo) return "mixed";
  if (hasVideo) return "video";
  if (hasImage || includesAny(text, ["deze foto", "this photo", "deze afbeelding", "this image"])) {
    return "image";
  }
  if (text.trim()) return "text";
  return "unknown";
}

function resolvePipelineFromHeuristics(input: {
  text: string;
  attachments: StudioIntentPlanAttachment[];
  inspirationId?: StudioAiHomeInspirationId | null;
}): {
  pipeline: StudioIntentRecommendedPipeline;
  purpose: StudioIntentPlanPurpose;
  target: StudioIntentPlanTarget;
  actionId: AssistantActionId | "unknown";
  videoIntent: StudioVideoIntent | null;
  experienceId: StudioIntentPlan["experienceId"];
  billingActionType: string | null;
  free: boolean;
} {
  if (input.inspirationId) {
    const insp = studioAiHomeInspiration(input.inspirationId);
    const actionId: AssistantActionId | "unknown" =
      insp.pipeline === "motion"
        ? "create_motion_video"
        : insp.pipeline === "editor"
          ? "create_fusion"
          : insp.pipeline === "character_new"
            ? "create_character"
            : insp.pipeline === "photo_video" || insp.pipeline === "quick_ad"
              ? "unknown"
              : "create_video_production";
    return {
      pipeline: insp.pipeline,
      purpose:
        insp.id === "advertisement"
          ? "advertisement"
          : insp.id === "social_video"
            ? "social"
            : insp.id === "animation"
              ? "animation"
              : insp.id === "story"
                ? "story"
                : insp.id === "logo" || insp.id === "product_photo"
                  ? "product"
                  : "create",
      target: insp.pipeline === "editor" ? "image" : insp.pipeline === "character_new" ? "character" : "video",
      actionId,
      videoIntent:
        insp.id === "advertisement"
          ? "product_commercial"
          : insp.id === "social_video"
            ? "fashion_reel"
            : null,
      experienceId: insp.experienceId ?? null,
      billingActionType: insp.billingActionType,
      free: Boolean(insp.free),
    };
  }

  const text = input.text;

  if (
    includesAny(text, [
      "snelle video",
      "quick video",
      "foto naar video",
      "photo to video",
      "photos to video",
      "slideshow",
      "van deze foto's",
      "from these photos",
    ]) ||
    (hasMedia(input.attachments) &&
      includesAny(text, ["video", "filmpje", "reel"]) &&
      !includesAny(text, ["ai", "cinematic", "advertentie", "ad ", "commercial", "reclame"]))
  ) {
    return {
      pipeline: "photo_video",
      purpose: "create",
      target: "video",
      actionId: "unknown",
      videoIntent: null,
      experienceId: null,
      billingActionType: null,
      free: true,
    };
  }

  if (
    includesAny(text, [
      "advertentie",
      "advertisement",
      "commercial",
      "reclame",
      "productadvertentie",
      "product ad",
    ])
  ) {
    return {
      pipeline: "quick_ad",
      purpose: "advertisement",
      target: "video",
      actionId: "create_video_production",
      videoIntent: "product_commercial",
      experienceId: "BUSINESS_COMMERCIAL",
      billingActionType: "publish_photo_story",
      free: false,
    };
  }

  if (
    includesAny(text, [
      "achtergrond",
      "background",
      "bewerk",
      "edit this",
      "pas aan",
      "verander alleen",
      "change only",
      "productfoto",
      "product photo",
      "productfoto maken",
    ]) &&
    !includesAny(text, ["video", "animatie", "animation", "reel", "advertentie", "advertisement", "reclame"])
  ) {
    return {
      pipeline: "editor",
      purpose: "edit",
      target: "image",
      actionId: "create_fusion",
      videoIntent: null,
      experienceId: "BUSINESS_PRODUCT",
      billingActionType: "image_edit",
      free: false,
    };
  }

  if (includesAny(text, ["animatie", "animation", "animate", "motion", "tot leven"])) {
    return {
      pipeline: "motion",
      purpose: "animation",
      target: "video",
      actionId: "create_motion_video",
      videoIntent: null,
      experienceId: "CREATIVE_ANIMATION",
      billingActionType: "motion_render",
      free: false,
    };
  }

  const videoIntent = detectStudioVideoIntent(text)?.intent ?? null;
  if (videoIntent === "product_commercial") {
    return {
      pipeline: "quick_ad",
      purpose: "advertisement",
      target: "video",
      actionId: "create_video_production",
      videoIntent,
      experienceId: "BUSINESS_COMMERCIAL",
      billingActionType: "publish_photo_story",
      free: false,
    };
  }

  const matched = matchAssistantIntent(text);
  if (matched.kind === "action") {
    const route = getAssistantAction(matched.actionId).canonicalRoute;
    let pipeline: StudioIntentRecommendedPipeline = "experience";
    if (matched.actionId === "create_motion_video") pipeline = "motion";
    if (matched.actionId === "create_fusion" || route.startsWith("/editor")) pipeline = "editor";
    if (matched.actionId === "create_character") pipeline = "character_new";
    if (matched.actionId === "create_character_from_reference") pipeline = "character_from_reference";
    if (matched.actionId === "create_video_production" && matched.videoIntent === "product_commercial") {
      pipeline = "quick_ad";
    }
    return {
      pipeline,
      purpose:
        matched.videoIntent === "product_commercial"
          ? "advertisement"
          : matched.actionId.includes("character")
            ? "create"
            : "create",
      target:
        pipeline === "editor"
          ? "image"
          : pipeline.startsWith("character")
            ? "character"
            : "video",
      actionId: matched.actionId,
      videoIntent: matched.videoIntent ?? videoIntent,
      experienceId: null,
      billingActionType:
        pipeline === "motion"
          ? "motion_render"
          : pipeline === "editor"
            ? "image_edit"
            : pipeline.startsWith("character")
              ? "character_generation"
              : pipeline === "quick_ad"
                ? "publish_photo_story"
                : "studio_orchestrator_production",
      free: false,
    };
  }

  if (includesAny(text, ["beeld", "afbeelding", "image", "foto maken", "make a photo", "design"])) {
    return {
      pipeline: "editor",
      purpose: "create",
      target: "image",
      actionId: "create_fusion",
      videoIntent: null,
      experienceId: null,
      billingActionType: "image_edit",
      free: false,
    };
  }

  if (includesAny(text, ["video", "reel", "filmpje", "clip"])) {
    return {
      pipeline: "experience",
      purpose: "create",
      target: "video",
      actionId: "create_video_production",
      videoIntent: videoIntent ?? "brand_story",
      experienceId: null,
      billingActionType: "studio_orchestrator_production",
      free: false,
    };
  }

  return {
    pipeline: "experience",
    purpose: "unknown",
    target: "unknown",
    actionId: "create_video_production",
    videoIntent: null,
    experienceId: null,
    billingActionType: "studio_orchestrator_production",
    free: false,
  };
}

function buildHandoffHref(input: {
  pipeline: StudioIntentRecommendedPipeline;
  prompt: string;
  actionId: AssistantActionId | "unknown";
  videoIntent: StudioVideoIntent | null;
  experienceId: StudioIntentPlan["experienceId"];
  attachments: StudioIntentPlanAttachment[];
}): string {
  const idea = input.prompt.trim().slice(0, 500);
  const character = characterAttachments(input.attachments)[0];
  const media = input.attachments.find((a) => a.kind === "media" && a.url);

  if (input.pipeline === "photo_video") {
    return "/studio/photo-video";
  }

  if (input.pipeline === "quick_ad") {
    const params = new URLSearchParams();
    if (idea) params.set("idea", idea);
    const qs = params.toString();
    return qs ? `/studio/quick-ad?${qs}` : "/studio/quick-ad";
  }

  if (input.pipeline === "orchestrator" && input.videoIntent) {
    return buildStudioStartHref({
      intent: input.videoIntent,
      idea: idea || undefined,
      characterId: character?.id,
      autoProduce: false,
    });
  }

  if (input.pipeline === "motion") {
    const params = new URLSearchParams();
    if (idea) params.set("idea", idea);
    if (media?.url) params.set("sourceImage", media.url);
    if (character?.id) params.set("characterId", character.id);
    const qs = params.toString();
    return qs ? `/motion/start?${qs}` : "/motion/start";
  }

  if (input.pipeline === "editor") {
    if (input.experienceId === "BUSINESS_LOGO_PLACEMENT") {
      return inspirationExperienceHref(input.experienceId, idea);
    }
    const params = new URLSearchParams();
    if (idea) params.set("idea", idea);
    if (media?.url) params.set("sourceImage", media.url);
    if (character?.id) params.set("characterId", character.id);
    const qs = params.toString();
    return qs ? `/editor/start?${qs}` : "/editor/start";
  }

  if (input.pipeline === "character_new") {
    return buildAssistantActionRoute("create_character", { idea });
  }

  if (input.pipeline === "character_from_reference") {
    return buildAssistantActionRoute("create_character_from_reference", {
      idea,
      sourceImage: media?.url ?? null,
    });
  }

  if (input.experienceId) {
    return inspirationExperienceHref(input.experienceId, idea);
  }

  if (input.actionId !== "unknown") {
    return buildAssistantActionRoute(input.actionId, {
      idea,
      videoIntent: input.videoIntent ?? undefined,
      sourceImage: media?.url ?? null,
    });
  }

  const params = new URLSearchParams();
  if (idea) params.set("idea", idea);
  if (input.videoIntent) params.set("intent", input.videoIntent);
  const qs = params.toString();
  return qs ? `/studio/experience?${qs}` : "/studio/experience";
}

function confidenceFrom(
  interpretation: AssistantInterpretation | null | undefined,
  purpose: StudioIntentPlanPurpose,
  missing: string[]
): StudioIntentPlanConfidence {
  if (missing.length > 0) return "low";
  if (interpretation?.confidence === "high" || interpretation?.confidence === "medium") {
    return interpretation.confidence;
  }
  if (purpose === "unknown") return "low";
  return "medium";
}

function buildSummary(input: {
  prompt: string;
  purpose: StudioIntentPlanPurpose;
  target: StudioIntentPlanTarget;
  durationSeconds: number | null;
  aspectRatio: string | null;
  format: string | null;
  characters: StudioIntentPlanAttachment[];
  brands: StudioIntentPlanAttachment[];
  interpretation?: AssistantInterpretation | null;
}): string {
  if (input.interpretation?.understoodGoal?.trim()) {
    return input.interpretation.understoodGoal.trim().slice(0, 200);
  }
  const parts: string[] = [];
  if (input.purpose === "advertisement") parts.push("product advertisement");
  else if (input.purpose === "social") parts.push("social video");
  else if (input.purpose === "animation") parts.push("animation");
  else if (input.target === "image") parts.push("image");
  else if (input.target === "video") parts.push("video");
  else parts.push(input.prompt.trim().slice(0, 80) || "creation");

  if (input.durationSeconds) parts.push(`${input.durationSeconds}s`);
  if (input.aspectRatio) parts.push(input.aspectRatio);
  if (input.format) parts.push(input.format.replace(/_/g, " "));
  if (input.characters[0]) parts.push(input.characters[0].name);
  if (input.brands[0]) parts.push(input.brands[0].name);
  return parts.join(" · ");
}

/**
 * Build IntentPlan from prompt + attachments (+ optional LLM interpretation).
 * Local heuristics first; interpretation enriches when present.
 */
export function buildStudioAiHomeIntentPlan(
  input: BuildStudioAiHomeIntentInput
): StudioIntentPlan {
  const prompt = input.prompt.trim();
  const attachments = input.attachments ?? [];
  const text = normalize(prompt);
  const characters = characterAttachments(attachments);
  const products = productAttachments(attachments);
  const brands = brandAttachments(attachments);

  const heuristics = resolvePipelineFromHeuristics({
    text,
    attachments,
    inspirationId: input.inspirationId,
  });

  // LLM interpretation can refine action when confidence is decent
  let pipeline = heuristics.pipeline;
  let actionId = heuristics.actionId;
  let videoIntent = heuristics.videoIntent;
  const experienceId = heuristics.experienceId;
  let purpose = heuristics.purpose;
  let target = heuristics.target;
  let billingActionType = heuristics.billingActionType;
  let free = heuristics.free;

  const interp = input.interpretation;
  if (interp && interp.likelyActionId !== "unknown" && interp.confidence !== "low") {
    if (interp.likelyActionId === "create_motion_video") {
      pipeline = "motion";
      actionId = "create_motion_video";
      purpose = "animation";
      target = "video";
      billingActionType = "motion_render";
      free = false;
    } else if (interp.targetModule === "editor" || interp.likelyActionId === "create_fusion") {
      pipeline = "editor";
      actionId =
        interp.likelyActionId === "create_fusion" ? "create_fusion" : interp.likelyActionId;
      target = "image";
      billingActionType = "image_edit";
      free = false;
    } else if (interp.suggestedRoute?.includes("photo-video")) {
      pipeline = "photo_video";
      free = true;
      billingActionType = null;
    } else if (interp.likelyActionId === "create_video_production") {
      actionId = "create_video_production";
      target = "video";
      if (purpose === "advertisement") {
        pipeline = "quick_ad";
        videoIntent = videoIntent ?? "product_commercial";
        billingActionType = "publish_photo_story";
      } else {
        pipeline = "experience";
        billingActionType = "studio_orchestrator_production";
      }
      free = false;
    }
  }

  const durationSeconds = detectDurationSeconds(text);
  const aspectRatio =
    detectAspectRatio(text) ??
    (purpose === "advertisement" || purpose === "social" ? "9:16" : null);
  const format = detectFormat(text);

  const missingRequired: string[] = [];
  let missingQuestionKey: string | null = null;

  if (!prompt && !input.inspirationId) {
    missingRequired.push("prompt");
    missingQuestionKey = "studio.aiHome.missing.prompt";
  }

  if (
    pipeline === "photo_video" &&
    !hasMedia(attachments) &&
    !includesAny(text, ["later", "zonder foto", "without photo"])
  ) {
    // Photo-video can start empty — user uploads in composer. Not blocking.
  }

  if (
    (pipeline === "motion" || purpose === "animation") &&
    !hasMedia(attachments) &&
    characters.length === 0 &&
    interp?.missingInputs?.includes("image")
  ) {
    missingRequired.push("media");
    missingQuestionKey = "studio.aiHome.missing.media";
  }

  const handoffHref = buildHandoffHref({
    pipeline,
    prompt,
    actionId,
    videoIntent,
    experienceId,
    attachments,
  });

  const summary = buildSummary({
    prompt,
    purpose,
    target,
    durationSeconds,
    aspectRatio,
    format,
    characters,
    brands,
    interpretation: interp,
  });

  return {
    version: 1,
    originalPrompt: prompt,
    summary,
    source: inferSource(text, attachments),
    target,
    purpose,
    format,
    durationSeconds,
    aspectRatio,
    style: purpose === "advertisement" ? "professional" : null,
    audio: pipeline === "photo_video" || target === "video" ? "optional" : "none",
    textOverlays: purpose === "advertisement" || purpose === "social" ? "probable" : "optional",
    attachments,
    characterIds: characters.map((c) => c.id),
    productIds: products.map((p) => p.id),
    brandKitIds: brands.map((b) => b.id),
    experienceId,
    videoIntent,
    assistantActionId: actionId,
    recommendedPipeline: pipeline,
    billingActionType,
    estimatedCredits: null,
    free,
    confidence: confidenceFrom(interp, purpose, missingRequired),
    missingRequired,
    missingQuestionKey,
    handoffHref,
    keepCharacterConsistent: characters.length > 0,
    inspirationId: input.inspirationId ?? null,
  };
}

/** Persist plan for handoff consumers (Phase 4 post-gen reuse). */
export const STUDIO_AI_HOME_PLAN_STORAGE_KEY = "hc-studio-ai-home-intent-plan-v1";

export function storeStudioAiHomeIntentPlan(plan: StudioIntentPlan): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STUDIO_AI_HOME_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    /* ignore quota */
  }
}

export function readStudioAiHomeIntentPlan(): StudioIntentPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STUDIO_AI_HOME_PLAN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudioIntentPlan;
  } catch {
    return null;
  }
}
