/**
 * Motion Studio Hub — wizard-first entry catalog (mirrors Character Studio hub).
 */

import type {
  MotionHubCategoryDefinition,
  MotionHubCategoryId,
  MotionHubEntry,
  MotionHubPhotoIntentId,
} from "@/types/motion-studio-hub";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import { getAllMotionActionPresets } from "@/lib/motion-action-presets";
import { resolveCreativeExperience } from "@/lib/studio-creative-director/experience-resolver";

export const MOTION_STUDIO_HUB_PATH = "/motion";

export const MOTION_WIZARD_CANONICAL_PATH = "/animate/instant";

export const MOTION_HUB_CATEGORIES: MotionHubCategoryDefinition[] = [
  {
    id: "photo_animation",
    titleKey: "motionHub.category.photoAnimation.title",
    descriptionKey: "motionHub.category.photoAnimation.description",
  },
  {
    id: "sports",
    titleKey: "motionHub.category.sports.title",
    descriptionKey: "motionHub.category.sports.description",
  },
  {
    id: "performance",
    titleKey: "motionHub.category.performance.title",
    descriptionKey: "motionHub.category.performance.description",
  },
  {
    id: "events",
    titleKey: "motionHub.category.events.title",
    descriptionKey: "motionHub.category.events.description",
  },
  {
    id: "lifestyle",
    titleKey: "motionHub.category.lifestyle.title",
    descriptionKey: "motionHub.category.lifestyle.description",
  },
  {
    id: "business",
    titleKey: "motionHub.category.business.title",
    descriptionKey: "motionHub.category.business.description",
  },
  {
    id: "adventure",
    titleKey: "motionHub.category.adventure.title",
    descriptionKey: "motionHub.category.adventure.description",
  },
  {
    id: "social",
    titleKey: "motionHub.category.social.title",
    descriptionKey: "motionHub.category.social.description",
  },
  {
    id: "mascots",
    titleKey: "motionHub.category.mascots.title",
    descriptionKey: "motionHub.category.mascots.description",
  },
];

const PHOTO_INTENT_ENTRIES: MotionHubEntry[] = [
  {
    id: "photo_animate",
    kind: "photo_intent",
    categoryId: "photo_animation",
    photoIntentId: "animate_photo",
    titleKey: "motionHub.photo.animatePhoto.title",
    descriptionKey: "motionHub.photo.animatePhoto.description",
    visibleInHub: true,
  },
  {
    id: "photo_bring_to_life",
    kind: "photo_intent",
    categoryId: "photo_animation",
    photoIntentId: "bring_photo_to_life",
    titleKey: "motionHub.photo.bringToLife.title",
    descriptionKey: "motionHub.photo.bringToLife.description",
    visibleInHub: true,
  },
  {
    id: "photo_to_video",
    kind: "photo_intent",
    categoryId: "photo_animation",
    photoIntentId: "photo_to_video",
    titleKey: "motionHub.photo.photoToVideo.title",
    descriptionKey: "motionHub.photo.photoToVideo.description",
    visibleInHub: true,
  },
];

/** Maps preset categories to hub display categories. */
const PRESET_CATEGORY_TO_HUB: Record<string, MotionHubCategoryId> = {
  sports: "sports",
  dance: "performance",
  comedy: "events",
  adventure: "adventure",
  lifestyle: "lifestyle",
  business: "business",
  social: "social",
  mascots: "mascots",
};

function presetHubEntry(presetId: MotionActionPresetId, categoryId: MotionHubCategoryId): MotionHubEntry {
  return {
    id: `preset_${presetId}`,
    kind: "action_preset",
    categoryId,
    presetId,
    titleKey: `motionHub.preset.${presetId}.title`,
    descriptionKey: `motionHub.preset.${presetId}.description`,
    visibleInHub: true,
  };
}

function buildPresetHubEntries(): MotionHubEntry[] {
  return getAllMotionActionPresets().map((preset) =>
    presetHubEntry(preset.id, PRESET_CATEGORY_TO_HUB[preset.category] ?? "social")
  );
}

let cachedEntries: MotionHubEntry[] | null = null;

export function motionHubEntries(): MotionHubEntry[] {
  if (!cachedEntries) {
    cachedEntries = [...PHOTO_INTENT_ENTRIES, ...buildPresetHubEntries()];
  }
  return cachedEntries;
}

export function motionHubVisibleEntries(): MotionHubEntry[] {
  return motionHubEntries().filter((entry) => entry.visibleInHub);
}

export function motionHubEntriesForCategory(categoryId: MotionHubCategoryId): MotionHubEntry[] {
  return motionHubVisibleEntries().filter((entry) => entry.categoryId === categoryId);
}

export function motionHubCategoryDefinition(
  categoryId: MotionHubCategoryId
): MotionHubCategoryDefinition {
  return MOTION_HUB_CATEGORIES.find((c) => c.id === categoryId) ?? MOTION_HUB_CATEGORIES[0]!;
}

export function buildMotionHubInstantHref(input: {
  presetId?: MotionActionPresetId;
  photoIntentId?: MotionHubPhotoIntentId;
  prefillId?: string;
  showcaseItemId?: string;
}): string {
  // S.6G — photo intents + presets that own a Product Experience Pack enter the guided funnel.
  // Unowned presets keep Instant + Matrix MOTION_PRESET (no fake pack).
  if (input.photoIntentId) {
    const funnelParams = new URLSearchParams({
      mode: "quick",
      photoIntent: input.photoIntentId,
    });
    return `/studio/experience?${funnelParams.toString()}`;
  }
  if (input.presetId) {
    const resolved = resolveCreativeExperience({ entryFan: input.presetId });
    if (resolved.resolveSource === "entryFan") {
      const funnelParams = new URLSearchParams({
        mode: "quick",
        preset: input.presetId,
        experience: resolved.experienceId,
      });
      return `/studio/experience?${funnelParams.toString()}`;
    }
  }

  const params = new URLSearchParams();
  if (input.prefillId) {
    params.set("prefill", input.prefillId);
  }
  if (input.presetId) {
    params.set("preset", input.presetId);
  }
  if (input.showcaseItemId) {
    params.set("showcaseItem", input.showcaseItemId);
  }
  const qs = params.toString();
  return qs ? `${MOTION_WIZARD_CANONICAL_PATH}?${qs}` : MOTION_WIZARD_CANONICAL_PATH;
}

export function buildMotionHubCategoryHref(categoryId: MotionHubCategoryId): string {
  return `${MOTION_STUDIO_HUB_PATH}?category=${categoryId}`;
}
