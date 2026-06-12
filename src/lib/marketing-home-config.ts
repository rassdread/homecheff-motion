import type { TranslationKey } from "@/i18n";

export const MARKETING_POSITIONING_KEYS = {
  tagline: "marketing.positioning.tagline" as TranslationKey,
  lead: "marketing.positioning.lead" as TranslationKey,
} as const;

export const MARKETING_CTA_KEYS = {
  startCreating: "marketing.cta.startCreating" as TranslationKey,
  seeExamples: "marketing.cta.seeExamples" as TranslationKey,
  learnMore: "marketing.cta.learnMore" as TranslationKey,
} as const;

export const MARKETING_CREATE_ANYTHING_CARDS: Array<{
  titleKey: TranslationKey;
  descKey: TranslationKey;
}> = [
  { titleKey: "marketing.createAnything.imageEditing", descKey: "marketing.createAnything.imageEditing.desc" },
  { titleKey: "marketing.createAnything.imageFusion", descKey: "marketing.createAnything.imageFusion.desc" },
  { titleKey: "marketing.createAnything.futureSelf", descKey: "marketing.createAnything.futureSelf.desc" },
  { titleKey: "marketing.createAnything.motion", descKey: "marketing.createAnything.motion.desc" },
  { titleKey: "marketing.createAnything.publish", descKey: "marketing.createAnything.publish.desc" },
  { titleKey: "marketing.createAnything.export", descKey: "marketing.createAnything.export.desc" },
];

export const MARKETING_IDEA_PIPELINE_KEYS: TranslationKey[] = [
  "marketing.ideaToContent.step.idea",
  "marketing.ideaToContent.step.image",
  "marketing.ideaToContent.step.animation",
  "marketing.ideaToContent.step.voice",
  "marketing.ideaToContent.step.music",
  "marketing.ideaToContent.step.publish",
];

export const MARKETING_POPULAR_CREATION_KEYS: TranslationKey[] = [
  "marketing.popularCreations.futureSelf",
  "marketing.popularCreations.outfit",
  "marketing.popularCreations.mascot",
  "marketing.popularCreations.petCharacter",
  "marketing.popularCreations.productMarketing",
  "marketing.popularCreations.animatedStory",
];

export const MARKETING_FREE_TIER_KEYS: TranslationKey[] = [
  "marketing.freePremium.free.ads",
  "marketing.freePremium.free.basic",
];

export const MARKETING_PREMIUM_TIER_KEYS: TranslationKey[] = [
  "marketing.freePremium.premium.generations",
  "marketing.freePremium.premium.sequences",
  "marketing.freePremium.premium.print",
  "marketing.freePremium.premium.motion",
];
