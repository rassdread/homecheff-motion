/**
 * Slice 1A — Unified Studio front door.
 * Intent-first home: four primary creation paths, no engine jargon.
 */

import type { TranslationKey } from "@/i18n";

export type StudioHomeIntentId = "quickVideo" | "image" | "aiVideo" | "animation";

export type StudioHomeIntent = {
  id: StudioHomeIntentId;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  href: string;
  /** Analytics event name (existing funnel conventions). */
  analyticsEvent: string;
  free?: boolean;
  usesCredits?: boolean;
};

/** Four primary creation intents on /studio home. */
export const STUDIO_HOME_INTENTS: readonly StudioHomeIntent[] = [
  {
    id: "quickVideo",
    titleKey: "studio.slice1a.intent.quickVideo.title",
    descriptionKey: "studio.slice1a.intent.quickVideo.desc",
    href: "/studio/photo-video",
    analyticsEvent: "studio_intent_quick_video",
    free: true,
  },
  {
    id: "image",
    titleKey: "studio.slice1a.intent.image.title",
    descriptionKey: "studio.slice1a.intent.image.desc",
    href: "/editor/start",
    analyticsEvent: "studio_intent_image",
  },
  {
    id: "aiVideo",
    titleKey: "studio.slice1a.intent.aiVideo.title",
    descriptionKey: "studio.slice1a.intent.aiVideo.desc",
    href: "/studio/experience",
    analyticsEvent: "studio_intent_ai_video",
    usesCredits: true,
  },
  {
    id: "animation",
    titleKey: "studio.slice1a.intent.animation.title",
    descriptionKey: "studio.slice1a.intent.animation.desc",
    href: "/motion/start",
    analyticsEvent: "studio_intent_animation",
    usesCredits: true,
  },
] as const;

/** HC contextual chooser — human options, no engine names. */
export type StudioHcContextualIntentId = "productVideo" | "image" | "aiVideo";

export type StudioHcContextualIntent = {
  id: StudioHcContextualIntentId;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  href: string;
};

export function studioHcContextualIntents(
  quickVideoHref: string
): readonly StudioHcContextualIntent[] {
  return [
    {
      id: "productVideo",
      titleKey: "studio.slice1a.hc.intent.productVideo.title",
      descriptionKey: "studio.slice1a.hc.intent.productVideo.desc",
      href: quickVideoHref,
    },
    {
      id: "image",
      titleKey: "studio.slice1a.hc.intent.image.title",
      descriptionKey: "studio.slice1a.hc.intent.image.desc",
      href: "/editor/start",
    },
    {
      id: "aiVideo",
      titleKey: "studio.slice1a.hc.intent.aiVideo.title",
      descriptionKey: "studio.slice1a.hc.intent.aiVideo.desc",
      href: "/studio/experience",
    },
  ];
}

export function studioHomeIntent(id: StudioHomeIntentId): StudioHomeIntent {
  const intent = STUDIO_HOME_INTENTS.find((entry) => entry.id === id);
  if (!intent) {
    throw new Error(`Unknown Studio home intent: ${id}`);
  }
  return intent;
}

export const STUDIO_HOME_CONTINUE_MAX = 3;

export const STUDIO_HOME_ADVANCED_HREF = "/studio/storyboards";
