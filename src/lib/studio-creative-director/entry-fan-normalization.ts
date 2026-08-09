/**
 * S.6G — Normalize heterogeneous consumer doors into one entryFan / experienceId.
 * Many doors → one Experience Pack owner (via resolveCreativeExperience).
 */

export type NormalizedConsumerDoor = {
  experienceId?: string;
  entryFan?: string;
  doorHint?: string;
  /** How the door was classified. */
  doorKind:
    | "experienceId"
    | "photoIntent"
    | "videoIntent"
    | "motionPreset"
    | "fusionIntent"
    | "characterStudioFlow"
    | "instantStyle"
    | "maakCard"
    | "assistantRecommendation"
    | "doorHint"
    | "unknown";
};

/** Video intents that intentionally stay unmapped (honest ENGINE_ONLY / no pack). */
export const UNMAPPED_VIDEO_INTENTS = new Set(["slideshow", "photo_story"]);

const PHOTO_INTENT_FAN: Record<string, string> = {
  animate_photo: "animate_photo",
  bring_photo_to_life: "bring_photo_to_life",
  photo_to_video: "photo_to_video",
  image_to_video: "photo_to_video",
};

const INSTANT_STYLE_FAN: Record<string, string> = {
  food_promo: "food_promo",
  clean_business: "clean_business",
  social_boost: "social_boost",
};

const CS_FLOW_FAN: Record<string, string> = {
  outfit: "character_studio_outfit",
  character_fusion: "character_fusion",
  mascot_transform: "mascot_transform",
  human_to_mascot: "human_into_mascot",
  mascot_to_human: "mascot_into_human",
  future_child: "future_child",
  genetic_blend: "genetic_blend",
  motion_ready: "motion_ready",
  full_body: "full_body",
  logo_placement: "logo_placement",
  character_upgrade: "character_upgrade",
};

const MAAK_CARD_EXPERIENCE: Record<string, string> = {
  photos: "CREATIVE_ANIMATION",
  new_story: "CREATIVE_STORYBOARD",
  story: "CREATIVE_STORYBOARD",
};

/**
 * Normalize a raw consumer door into resolver inputs.
 * Does not invent packs for unmapped slideshow/photo_story.
 */
export function normalizeConsumerDoor(input: {
  experienceId?: string | null;
  entryFan?: string | null;
  doorHint?: string | null;
  photoIntent?: string | null;
  videoIntent?: string | null;
  motionPreset?: string | null;
  fusionIntent?: string | null;
  characterStudioFlow?: string | null;
  instantStyle?: string | null;
  maakCard?: string | null;
  assistantRecommendation?: string | null;
}): NormalizedConsumerDoor {
  if (input.experienceId?.trim()) {
    return {
      experienceId: input.experienceId.trim(),
      doorKind: "experienceId",
    };
  }

  if (input.entryFan?.trim()) {
    return { entryFan: input.entryFan.trim(), doorKind: "doorHint" };
  }

  if (input.photoIntent?.trim()) {
    const key = input.photoIntent.trim();
    const fan = PHOTO_INTENT_FAN[key] ?? key;
    return { entryFan: fan, doorKind: "photoIntent" };
  }

  if (input.videoIntent?.trim()) {
    const intent = input.videoIntent.trim();
    if (UNMAPPED_VIDEO_INTENTS.has(intent)) {
      return { doorHint: intent, doorKind: "videoIntent" };
    }
    return { entryFan: intent, doorKind: "videoIntent" };
  }

  if (input.motionPreset?.trim()) {
    return {
      entryFan: input.motionPreset.trim(),
      doorKind: "motionPreset",
    };
  }

  if (input.fusionIntent?.trim()) {
    return {
      entryFan: input.fusionIntent.trim(),
      doorKind: "fusionIntent",
    };
  }

  if (input.characterStudioFlow?.trim()) {
    const flow = input.characterStudioFlow.trim();
    return {
      entryFan: CS_FLOW_FAN[flow] ?? flow,
      doorKind: "characterStudioFlow",
    };
  }

  if (input.instantStyle?.trim()) {
    const style = input.instantStyle.trim();
    return {
      entryFan: INSTANT_STYLE_FAN[style] ?? style,
      doorKind: "instantStyle",
    };
  }

  if (input.maakCard?.trim()) {
    const card = input.maakCard.trim().toLowerCase();
    const experienceId = MAAK_CARD_EXPERIENCE[card];
    if (experienceId) {
      return { experienceId, doorKind: "maakCard" };
    }
    return { doorHint: card, doorKind: "maakCard" };
  }

  if (input.assistantRecommendation?.trim()) {
    return {
      entryFan: input.assistantRecommendation.trim(),
      doorKind: "assistantRecommendation",
    };
  }

  if (input.doorHint?.trim()) {
    return { doorHint: input.doorHint.trim(), doorKind: "doorHint" };
  }

  return { doorKind: "unknown" };
}
