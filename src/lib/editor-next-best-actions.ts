import { editorHandoffStudioUrl } from "@/lib/editor-instruction-handoff";
import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import {
  resolveEditorToMotionHandoffUrl,
  resolveEditorToPublishHandoffUrl,
  resolveEditorToStudioHandoffUrl,
} from "@/lib/homecheff-project-handoff-routes";
import { editorTransformationMotionUrl } from "@/lib/editor-transformation-handoff";
import { estimateEditorGenerationCost } from "@/lib/editor-generation-cost";
import type {
  EditorNextBestAction,
  EditorNextBestActionInput,
} from "@/types/editor-generation-package";

type PublishHandoffIntent =
  | "text_overlay"
  | "social_post"
  | "social_carousel"
  | "subtitles"
  | "voice"
  | "music"
  | "print"
  | "flyer"
  | "story";

export const EDITOR_FREE_POST_GENERATION_ACTIONS = new Set([
  "download",
  "save_library",
  "send_studio_scene",
  "download_frames",
  "download_package",
  "export_hc",
]);

export function isFreePostGenerationAction(actionId: string): boolean {
  return EDITOR_FREE_POST_GENERATION_ACTIONS.has(actionId);
}

export function resolveEditorNextBestActions(input: EditorNextBestActionInput): EditorNextBestAction[] {
  const actions: EditorNextBestAction[] = [];
  const motionAllowed = Boolean(input.document && activeApprovedVariant(input.document));
  const handoffBase = {
    document: input.document,
    editorSessionId: input.editorSessionId ?? "",
    packageId: input.packageId,
    resultUrl: input.primaryResultUrl,
    hcProjectId: input.hcProjectId ?? input.document?.instructionStudioState?.hcProjectId,
    syncToServer: input.syncHcToServer,
  };
  const studioHref = handoffBase.editorSessionId
    ? resolveEditorToStudioHandoffUrl(handoffBase)
    : undefined;
  const publishHref = (intent: PublishHandoffIntent) =>
    handoffBase.editorSessionId
      ? resolveEditorToPublishHandoffUrl({ ...handoffBase, intent })
      : undefined;

  const push = (action: EditorNextBestAction) => {
    actions.push(action);
  };

  if (input.resultType === "animation") {
    push({
      id: "download",
      labelKey: "editor.postGen.downloadVideo",
      descriptionKey: "editor.postGen.downloadVideoHint",
      cost: "free",
      priority: 1,
    });
    push({
      id: "save_library",
      labelKey: "editor.postGen.saveLibrary",
      descriptionKey: "editor.postGen.saveLibraryHint",
      cost: "free",
      priority: 2,
    });
    push({
      id: "send_studio_scene",
      labelKey: "editor.postGen.studioScene",
      descriptionKey: "editor.postGen.studioSceneHint",
      cost: "free",
      href: studioHref,
      priority: 3,
    });
    push({
      id: "add_subtitles",
      labelKey: "editor.postGen.addSubtitles",
      descriptionKey: "editor.postGen.addSubtitlesHint",
      cost: "free",
      href: publishHref("subtitles"),
      priority: 4,
    });
    push({
      id: "add_voiceover",
      labelKey: "editor.postGen.addVoiceover",
      descriptionKey: "editor.postGen.addVoiceoverHint",
      cost: "credits",
      creditCost: 1,
      href: publishHref("voice"),
      priority: 5,
    });
    push({
      id: "add_music",
      labelKey: "editor.postGen.addMusic",
      descriptionKey: "editor.postGen.addMusicHint",
      cost: "credits",
      creditCost: 1,
      href: publishHref("music"),
      priority: 6,
    });
    push({
      id: "export_tiktok",
      labelKey: "editor.postGen.exportTiktok",
      descriptionKey: "editor.postGen.exportSocialHint",
      cost: input.userTier === "free" ? "credits" : "free",
      creditCost: input.userTier === "free" ? 1 : 0,
      priority: 7,
    });
  } else if (input.resultType === "sequence") {
    if (motionAllowed) {
      push({
        id: "animate_5s",
        labelKey: "editor.postGen.animateSequence",
        descriptionKey: "editor.postGen.animateSequenceHint",
        cost: "motion_credits",
        creditCost: 1,
        priority: 1,
      });
    }
    push({
      id: "generate_variant",
      labelKey: "editor.postGen.generateVariant",
      descriptionKey: "editor.postGen.generateVariantHint",
      cost: "credits",
      creditCost: 1,
      priority: motionAllowed ? 2 : 1,
    });
    push({
      id: "send_studio_scene",
      labelKey: "editor.postGen.studioScene",
      descriptionKey: "editor.postGen.studioSceneHint",
      cost: "free",
      href: studioHref,
      priority: 2,
    });
    push({
      id: "download_frames",
      labelKey: "editor.postGen.downloadFrames",
      descriptionKey: "editor.postGen.downloadFramesHint",
      cost: "free",
      priority: 3,
    });
    push({
      id: "download_package",
      labelKey: "editor.postGen.downloadPackage",
      descriptionKey: "editor.postGen.downloadPackageHint",
      cost: "free",
      priority: 4,
    });
    push({
      id: "export_hc",
      labelKey: "hcProject.export",
      descriptionKey: "hcProject.exportHint",
      cost: "free",
      priority: 5,
    });
    push({
      id: "create_social_post",
      labelKey: "editor.postGen.createSocial",
      descriptionKey: "editor.postGen.createSocialHint",
      cost: input.userTier === "premium" ? "free" : "credits",
      creditCost: input.userTier === "premium" ? 0 : 1,
      href: publishHref("social_carousel"),
      priority: 5,
    });
    push({
      id: "create_social_story",
      labelKey: "editor.postGen.createStory",
      descriptionKey: "editor.postGen.createStoryHint",
      cost: input.userTier === "premium" ? "free" : "credits",
      creditCost: input.userTier === "premium" ? 0 : 1,
      href: publishHref("story"),
      priority: 6,
    });
    push({
      id: "save_library",
      labelKey: "editor.postGen.saveLibrary",
      descriptionKey: "editor.postGen.saveLibraryHint",
      cost: "free",
      priority: 7,
    });
  } else {
    const workflow = String(input.workflow ?? "");

    if (workflow.includes("outfit")) {
      push({
        id: "create_social_post",
        labelKey: "editor.postGen.createSocial",
        descriptionKey: "editor.postGen.outfitSocialHint",
        cost: input.userTier === "premium" ? "free" : "credits",
        creditCost: input.userTier === "premium" ? 0 : 1,
        href: publishHref("social_post"),
        priority: 1,
      });
      push({
        id: "generate_variant",
        labelKey: "editor.postGen.generateVariant",
        descriptionKey: "editor.postGen.generateVariantHint",
        cost: "credits",
        creditCost: 1,
        priority: 2,
      });
      if (motionAllowed) {
        push({
          id: "animate_3s",
          labelKey: "editor.postGen.animate3s",
          descriptionKey: "editor.postGen.animateHint",
          cost: "motion_credits",
          creditCost: 1,
          priority: 3,
        });
      }
    } else {
      push({
        id: "publish_share_ready",
        labelKey: "editor.postGen.publishReady",
        descriptionKey: "editor.postGen.publishReadyHint",
        cost: input.userTier === "free" ? "credits" : "free",
        creditCost: input.userTier === "free" ? 1 : 0,
        href: publishHref("text_overlay"),
        priority: 1,
      });
      push({
        id: "generate_variant",
        labelKey: "editor.postGen.generateVariant",
        descriptionKey: "editor.postGen.generateVariantHint",
        cost: "credits",
        creditCost: 1,
        priority: 2,
      });
      if (motionAllowed) {
        push({
          id: "animate_3s",
          labelKey: "editor.postGen.animate3s",
          descriptionKey: "editor.postGen.animateHint",
          cost: "motion_credits",
          creditCost: 1,
          priority: 3,
        });
      }
    }

    push({
      id: "download",
      labelKey: "editor.postGen.download",
      descriptionKey: "editor.postGen.downloadHint",
      cost: "free",
      priority: 10,
    });
    push({
      id: "save_library",
      labelKey: "editor.postGen.saveLibrary",
      descriptionKey: "editor.postGen.saveLibraryHint",
      cost: "free",
      priority: 11,
    });
    push({
      id: "send_studio_scene",
      labelKey: "editor.postGen.studioScene",
      descriptionKey: "editor.postGen.studioSceneHint",
      cost: "free",
      href: studioHref,
      priority: 12,
    });
    push({
      id: "prepare_print",
      labelKey: "editor.postGen.preparePrint",
      descriptionKey: "editor.postGen.preparePrintHint",
      cost: "free",
      href: publishHref("print"),
      priority: 13,
    });
    push({
      id: "export_hc",
      labelKey: "hcProject.export",
      descriptionKey: "hcProject.exportHint",
      cost: "free",
      priority: 14,
    });
  }

  if (input.userTier === "free" && input.lastAccessPath === "ad") {
    push({
      id: "watch_ad",
      labelKey: "editor.postGen.watchAd",
      descriptionKey: "editor.postGen.watchAdHint",
      cost: "ad_eligible",
      priority: 90,
    });
    push({
      id: "buy_credits",
      labelKey: "editor.postGen.buyCredits",
      descriptionKey: "editor.postGen.buyCreditsHint",
      cost: "credits",
      priority: 91,
    });
    push({
      id: "upgrade_premium",
      labelKey: "editor.postGen.upgradePremium",
      descriptionKey: "editor.postGen.upgradePremiumHint",
      cost: "premium",
      priority: 92,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

export function motionAnimationCreditCost(durationSec: number): number {
  const cost = estimateEditorGenerationCost("transformation_sequence", {
    motionDurationSec: durationSec,
    outputMode: "sequence",
    stepCount: 3,
  });
  return cost.creditCost;
}
