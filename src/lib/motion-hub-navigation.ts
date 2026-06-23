/**
 * Motion hub navigation — reuses assistant prefill storage + instant wizard.
 */

import { buildActionPresetPrefillPackage } from "@/lib/motion-action-preset-prefill";
import { createAssistantPrefillId } from "@/lib/assistant-prefill-storage";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { MotionHubPhotoIntentId } from "@/types/motion-studio-hub";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import { buildMotionHubInstantHref } from "@/lib/motion-studio-hub";

const PHOTO_INTENT_COPY: Record<
  MotionHubPhotoIntentId,
  { goal: string; prompt: string }
> = {
  animate_photo: {
    goal: "Animate my photo with natural cinematic motion.",
    prompt:
      "Animate the main subject in the photo with natural cinematic motion. Preserve exact face identity, hair, clothing, colors, and proportions. Smooth realistic movement.",
  },
  bring_photo_to_life: {
    goal: "Bring my photo to life with subtle expressive motion.",
    prompt:
      "Bring the photo to life with subtle expressive motion — breathing, blinking, gentle gestures. Preserve exact identity, face structure, hair, outfit, and brand elements.",
  },
  photo_to_video: {
    goal: "Turn my photo into a short video clip.",
    prompt:
      "Turn this photo into a short cinematic video clip. Preserve the subject identity exactly. Natural camera motion and realistic body movement.",
  },
};

export function buildPhotoIntentPrefillPackage(
  photoIntentId: MotionHubPhotoIntentId
): AssistantPrefillPackage {
  const copy = PHOTO_INTENT_COPY[photoIntentId];
  return {
    version: 1,
    id: createAssistantPrefillId(),
    intent: "motion_video",
    actionId: "create_motion_video",
    targetRoute: buildMotionHubInstantHref({ photoIntentId }),
    projectId: null,
    generationGoal: copy.goal,
    promptDraft: copy.prompt,
    estimatedCost: null,
    readiness: "ready_to_open",
    missingInputs: ["assistant.prefill.missing.person"],
    pendingQuestions: [],
    activitySteps: [
      { id: "intent", labelKey: "assistant.prefill.activity.intent", status: "done" },
      { id: "route", labelKey: "assistant.prefill.activity.route", status: "done" },
      { id: "review", labelKey: "assistant.prefill.activity.review", status: "active" },
    ],
    outputSettings: {
      photoIntentId,
    },
    protectionSettings: {
      preserveIdentity: true,
      preserveFace: true,
      preserveCharacterConsistency: true,
    },
    motion: {
      style: "cinematic",
      durationSeconds: 8,
      scenePrompt: copy.prompt,
    },
    understoodKey: "assistant.understood.create_motion_video",
    settingLabelKeys: ["assistant.prefill.setting.motionStyle"],
    interpretationSummary: {
      understoodGoal: copy.goal,
      confidence: "high",
      feasibilityNotes: [],
      source: "rules",
      followUpQuestions: [],
    },
    createdAt: new Date().toISOString(),
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

export function buildMotionHubPrefillPackage(input: {
  presetId?: MotionActionPresetId;
  photoIntentId?: MotionHubPhotoIntentId;
  showcaseItemId?: string;
  showcaseMediaUrl?: string;
}): AssistantPrefillPackage | null {
  if (input.presetId) {
    const pkg = buildActionPresetPrefillPackage({ presetId: input.presetId });
    if (!pkg) {
      return null;
    }
    if (input.showcaseItemId) {
      return {
        ...pkg,
        targetRoute: buildMotionHubInstantHref({
          presetId: input.presetId,
          prefillId: pkg.id,
          showcaseItemId: input.showcaseItemId,
        }),
        outputSettings: {
          ...pkg.outputSettings,
          showcaseItemId: input.showcaseItemId,
          ...(input.showcaseMediaUrl ? { showcaseMediaUrl: input.showcaseMediaUrl } : {}),
        },
      };
    }
    return pkg;
  }
  if (input.photoIntentId) {
    const pkg = buildPhotoIntentPrefillPackage(input.photoIntentId);
    if (input.showcaseItemId) {
      return {
        ...pkg,
        targetRoute: buildMotionHubInstantHref({
          photoIntentId: input.photoIntentId,
          prefillId: pkg.id,
          showcaseItemId: input.showcaseItemId,
        }),
        outputSettings: {
          ...pkg.outputSettings,
          showcaseItemId: input.showcaseItemId,
          ...(input.showcaseMediaUrl ? { showcaseMediaUrl: input.showcaseMediaUrl } : {}),
        },
      };
    }
    return pkg;
  }
  return null;
}
