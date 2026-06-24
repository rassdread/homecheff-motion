/**
 * Build Video Plan Contract — source of truth for quotes, reservations, and execution gates.
 */

import {
  buildProductionPricingEstimate,
  computeProductionCogs,
  grossMarginAtWorstPack,
  resolveProductionPricingShell,
} from "@/lib/studio-production-pricing-engine";
import { createStudioWorkflowTransactionId } from "@/lib/studio-analysis-planner";
import { buildUniqueAssetLearningPlan } from "@/lib/studio-unique-asset-learning";
import type { StudioAnalysisPlannerInput } from "@/lib/studio-analysis-planner";
import type {
  PostProductionActionType,
  VideoPlanContract,
  VideoPlanLineItem,
  VideoPlanPhaseId,
} from "@/types/studio-video-plan-contract";
import {
  DEFAULT_INITIAL_ALLOWED_ACTIONS as ALLOWED,
  VIDEO_PLAN_PHASE_KEYS,
} from "@/types/studio-video-plan-contract";
import type { StudioVideoIntent } from "@/types/studio-video-production";

export type VideoPlanContractInput = StudioAnalysisPlannerInput & {
  hcProjectId?: string;
  kind?: VideoPlanContract["kind"];
  postProductionAction?: PostProductionActionType;
};

function item(
  partial: Omit<VideoPlanLineItem, "credits"> & { credits?: number }
): VideoPlanLineItem {
  return { credits: 0, ...partial };
}

/** Build initial or post-production Video Plan Contract. */
export function buildVideoPlanContract(input: VideoPlanContractInput): VideoPlanContract {
  const photoCount = Math.max(0, input.photoCount ?? input.imageCount ?? 0);
  const logoCount = Math.max(0, input.logoCount ?? 0);
  const productCount = Math.max(0, input.productCount ?? 0);
  const characterCount = Math.max(1, input.characterCount ?? (input.characterId ? 1 : 0));
  const hasCommercialUploads =
    input.hasCommercialUploads ?? (logoCount > 0 || productCount > 0);

  const learningPlan = buildUniqueAssetLearningPlan({
    photoCount,
    logoCount,
    productCount,
    characterCount: input.characterId || input.characterCount ? characterCount : 0,
    mascotCount: input.mascotCount,
    audioCount: input.hasUploadedAudio || input.audioProfile ? 1 : 0,
    videoCount: input.hasUploadedVideo ? 1 : 0,
    cachedAnalysisSources: input.cachedAnalysisSources,
  });

  const shell = resolveProductionPricingShell({
    intent: input.intent,
    audioProfile: input.audioProfile,
    imageCount: input.imageCount,
    photoCount,
    targetDurationSeconds: input.targetDurationSeconds,
    characterId: input.characterId,
    hasCommercialUploads,
    usesCharacterLedCommercial:
      input.intent === "product_commercial" && Boolean(input.characterId),
  });

  const needsPodcastStt = input.intent === "podcast_video";
  const audioDurationSeconds = input.audioProfile?.durationSeconds;

  const pricing = buildProductionPricingEstimate({
    shell,
    learningPlan,
    includeFinishing: input.kind !== "post_production",
    audioDurationSeconds,
    needsPodcastStt,
  });

  const cacheSavingsUsd =
    learningPlan.totalUniqueProfilesCached * 0.015 +
    (input.cachedAnalysisSources?.length ?? 0) * 0.015;

  const lineItems: VideoPlanLineItem[] = [];

  if (photoCount > 0) {
    lineItems.push(
      item({
        id: "upload_photos",
        phase: "learning",
        labelKey: "studio.videoPlan.photos",
        quantity: photoCount,
        costInventoryId: "openai_vision_per_image",
      })
    );
  }
  if (logoCount > 0) {
    lineItems.push(
      item({
        id: "upload_logos",
        phase: "learning",
        labelKey: "studio.videoPlan.logos",
        quantity: logoCount,
        costInventoryId: "openai_vision_per_image",
      })
    );
  }
  if (productCount > 0) {
    lineItems.push(
      item({
        id: "upload_products",
        phase: "learning",
        labelKey: "studio.videoPlan.products",
        quantity: productCount,
        costInventoryId: "openai_vision_per_image",
      })
    );
  }
  if (input.characterId || (input.characterCount ?? 0) > 0) {
    lineItems.push(
      item({
        id: "upload_character",
        phase: "learning",
        labelKey: "studio.videoPlan.character",
        quantity: 1,
        cached: learningPlan.slots.some((s) => s.kind === "character" && s.cached),
        costInventoryId: "openai_character_analysis",
      })
    );
  }
  if (input.hasUploadedAudio || input.audioProfile) {
    lineItems.push(
      item({
        id: "upload_audio",
        phase: "learning",
        labelKey: "studio.videoPlan.audio",
        quantity: 1,
        costInventoryId: needsPodcastStt ? "elevenlabs_stt" : "openai_vision_per_image",
      })
    );
  }

  if (shell.openAiSceneCount > 0) {
    lineItems.push(
      item({
        id: "scenes_generated",
        phase: "scenes",
        labelKey: "studio.videoPlan.scenes",
        quantity: shell.openAiSceneCount,
        costInventoryId: "openai_scene_generation",
      })
    );
  } else if (shell.sceneCount > 0) {
    lineItems.push(
      item({
        id: "scenes_from_uploads",
        phase: "scenes",
        labelKey: "studio.videoPlan.scenes",
        quantity: shell.sceneCount,
      })
    );
  }

  if (shell.batchCount > 0) {
    lineItems.push(
      item({
        id: "render_batches",
        phase: "rendering",
        labelKey: "studio.videoPlan.renderBatches",
        quantity: shell.batchCount,
        costInventoryId: "vidu_render_scene",
      })
    );
  }

  if (input.kind !== "post_production") {
    lineItems.push(
      item({
        id: "finish_export",
        phase: "finishing",
        labelKey: "studio.videoPlan.export",
        quantity: 1,
        costInventoryId: "ffmpeg_export",
      })
    );
    if (shell.ffmpegMergeRequired) {
      lineItems.push(
        item({
          id: "finish_merge",
          phase: "finishing",
          labelKey: "studio.videoPlan.merge",
          quantity: Math.max(0, shell.batchCount - 1),
          costInventoryId: "ffmpeg_merge",
        })
      );
    }
  }

  distributeCreditsToLineItems(lineItems, pricing);

  const phases: VideoPlanContract["phases"] = (
    ["learning", "scenes", "rendering", "finishing"] as VideoPlanPhaseId[]
  )
    .map((phaseId) => {
      const phaseItems = lineItems.filter((i) => i.phase === phaseId);
      if (phaseItems.length === 0) return null;
      return {
        id: phaseId,
        titleKey: VIDEO_PLAN_PHASE_KEYS[phaseId],
        items: phaseItems,
        credits: phaseItems.reduce((s, i) => s + i.credits, 0),
      };
    })
    .filter(Boolean) as VideoPlanContract["phases"];

  const estimatedRetries = Math.max(1, Math.ceil(shell.sceneCount / 10));

  return {
    id: createStudioWorkflowTransactionId(),
    kind: input.kind ?? "initial_production",
    intent: input.intent,
    hcProjectId: input.hcProjectId,
    phases,
    lineItems,
    uploads: {
      photos: photoCount,
      logos: logoCount,
      products: productCount,
      characters: input.characterId || input.characterCount ? 1 : 0,
      audio: input.hasUploadedAudio || input.audioProfile ? 1 : 0,
      video: input.hasUploadedVideo ? 1 : 0,
    },
    scenes: shell.sceneCount,
    batches: shell.batchCount,
    estimatedRetries,
    allowedActions: [...ALLOWED],
    totalCredits: pricing.totalCredits,
    estimatedCogsUsd: pricing.totalUsd,
    targetGrossMargin: pricing.targetGrossMargin,
    grossMarginAtWorstPack: grossMarginAtWorstPack(pricing.totalCredits, pricing.totalUsd),
    cacheSavingsUsd,
    createdAt: new Date().toISOString(),
    postProductionAction: input.postProductionAction,
  };
}

function distributeCreditsToLineItems(
  items: VideoPlanLineItem[],
  pricing: ReturnType<typeof buildProductionPricingEstimate>
): void {
  const phaseTotals: Record<VideoPlanPhaseId, number> = {
    learning: pricing.learningCredits,
    scenes: pricing.sceneCredits,
    rendering: pricing.renderCredits,
    finishing: pricing.finishingCredits,
  };

  for (const phase of Object.keys(phaseTotals) as VideoPlanPhaseId[]) {
    const phaseItems = items.filter((i) => i.phase === phase);
    const total = phaseTotals[phase];
    if (phaseItems.length === 0 || total <= 0) continue;
    const per = Math.floor(total / phaseItems.length);
    let remainder = total - per * phaseItems.length;
    for (const li of phaseItems) {
      li.credits = per + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
  }
}

/** Post-production add-on contracts (voice, translation, export, etc.). */
export function buildPostProductionContract(params: {
  hcProjectId: string;
  intent: StudioVideoIntent;
  action: PostProductionActionType;
  overrideCredits?: number;
}): VideoPlanContract {
  const base = buildVideoPlanContract({
    intent: params.intent,
    hcProjectId: params.hcProjectId,
    kind: "post_production",
    postProductionAction: params.action,
    photoCount: 0,
  });

  const actionCredits =
    params.overrideCredits ??
    ({
      voice_over: 22,
      subtitle: 18,
      translation: 34,
      music_replace: 40,
      new_export: 8,
      new_ending: 120,
      add_character: 80,
      scene_regen: 25,
    }[params.action] ?? 15);

  return {
    ...base,
    kind: "post_production",
    postProductionAction: params.action,
    totalCredits: actionCredits,
    allowedActions: mapPostActionToAllowed(params.action),
    phases: [
      {
        id: "finishing",
        titleKey: VIDEO_PLAN_PHASE_KEYS.finishing,
        items: [
          item({
            id: `post_${params.action}`,
            phase: "finishing",
            labelKey: `studio.videoPlan.post.${params.action}`,
            credits: actionCredits,
          }),
        ],
        credits: actionCredits,
      },
    ],
    lineItems: [
      item({
        id: `post_${params.action}`,
        phase: "finishing",
        labelKey: `studio.videoPlan.post.${params.action}`,
        credits: actionCredits,
      }),
    ],
  };
}

function mapPostActionToAllowed(
  action: PostProductionActionType
): VideoPlanContract["allowedActions"] {
  switch (action) {
    case "voice_over":
      return ["voice_generation"];
    case "subtitle":
      return ["subtitle_transcription"];
    case "translation":
      return ["translation_export"];
    case "music_replace":
      return ["music_generation"];
    case "new_export":
      return ["publish_mp4_export"];
    case "scene_regen":
      return ["scene_generation"];
    default:
      return ["scene_generation", "motion_render", "publish_mp4_export"];
  }
}

export function contractToLegacyCogs(contract: VideoPlanContract) {
  return {
    estimatedCogsUsd: contract.estimatedCogsUsd,
    targetGrossMargin: contract.targetGrossMargin,
    grossMarginAtWorstPack: contract.grossMarginAtWorstPack,
  };
}

export { computeProductionCogs };
