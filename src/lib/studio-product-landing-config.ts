import type { TranslationKey } from "@/i18n";

export const STUDIO_PRODUCT_LANDING_MODULES = [
  "editor",
  "studio",
  "motion",
  "publish",
  "library",
  "usage",
] as const;

export type StudioProductLandingModuleKey = (typeof STUDIO_PRODUCT_LANDING_MODULES)[number];

export type StudioProductLandingConfig = {
  moduleKey: StudioProductLandingModuleKey;
  eyebrowKey: TranslationKey;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  descriptionKey: TranslationKey;
  primaryCtaKey: TranslationKey;
  primaryCtaHref: string;
  secondaryCtaKey: TranslationKey;
  secondaryCtaHref: string;
  featureCardKeys: TranslationKey[];
  workflowStepKeys: TranslationKey[];
  examplePromptKeys: TranslationKey[];
  benefitKeys: TranslationKey[];
  orbitLabelKey: TranslationKey;
  accentColor: string;
  accentSecondary?: string;
};

export const STUDIO_PRODUCT_LANDING_CONFIG: Record<
  StudioProductLandingModuleKey,
  StudioProductLandingConfig
> = {
  editor: {
    moduleKey: "editor",
    eyebrowKey: "landing.editor.eyebrow",
    titleKey: "landing.editor.title",
    subtitleKey: "landing.editor.subtitle",
    descriptionKey: "landing.editor.description",
    primaryCtaKey: "landing.editor.primaryCta",
    primaryCtaHref: "/editor/start",
    secondaryCtaKey: "landing.editor.secondaryCta",
    secondaryCtaHref: "/editor/start?recent=1",
    featureCardKeys: [
      "landing.editor.feature.aiDirector",
      "landing.editor.feature.objectFirst",
      "landing.editor.feature.outfit",
      "landing.editor.feature.style",
      "landing.editor.feature.print",
      "landing.editor.feature.motionReady",
    ],
    workflowStepKeys: [
      "landing.editor.step.upload",
      "landing.editor.step.plan",
      "landing.editor.step.generate",
      "landing.editor.step.deliver",
    ],
    examplePromptKeys: [
      "landing.editor.prompt.outfit",
      "landing.editor.prompt.logo",
      "landing.editor.prompt.background",
    ],
    benefitKeys: [
      "landing.editor.benefit.noPhotoshop",
      "landing.editor.benefit.structured",
      "landing.editor.benefit.variants",
    ],
    orbitLabelKey: "suite.nav.editor",
    accentColor: "#0067B1",
    accentSecondary: "#006D52",
  },
  studio: {
    moduleKey: "studio",
    eyebrowKey: "landing.studio.eyebrow",
    titleKey: "landing.studio.title",
    subtitleKey: "landing.studio.subtitle",
    descriptionKey: "landing.studio.description",
    primaryCtaKey: "landing.studio.primaryCta",
    primaryCtaHref: "/studio/storyboards/new",
    secondaryCtaKey: "landing.studio.secondaryCta",
    secondaryCtaHref: "/studio/start",
    featureCardKeys: [
      "landing.studio.feature.scenes",
      "landing.studio.feature.story",
      "landing.studio.feature.voice",
      "landing.studio.feature.brand",
      "landing.studio.feature.versions",
    ],
    workflowStepKeys: [
      "landing.studio.step.concept",
      "landing.studio.step.scenes",
      "landing.studio.step.production",
      "landing.studio.step.publish",
    ],
    examplePromptKeys: [],
    benefitKeys: [
      "landing.studio.benefit.pipeline",
      "landing.studio.benefit.consistency",
    ],
    orbitLabelKey: "suite.nav.studio",
    accentColor: "#0067B1",
    accentSecondary: "#006D52",
  },
  motion: {
    moduleKey: "motion",
    eyebrowKey: "landing.motion.eyebrow",
    titleKey: "landing.motion.title",
    subtitleKey: "landing.motion.subtitle",
    descriptionKey: "landing.motion.description",
    primaryCtaKey: "landing.motion.primaryCta",
    primaryCtaHref: "/motion/start",
    secondaryCtaKey: "landing.motion.secondaryCta",
    secondaryCtaHref: "/animate/instant?editorActiveVariant=1",
    featureCardKeys: [
      "landing.motion.feature.imageToVideo",
      "landing.motion.feature.transformation",
      "landing.motion.feature.scene",
      "landing.motion.feature.transitions",
      "landing.motion.feature.handoff",
    ],
    workflowStepKeys: [],
    examplePromptKeys: [],
    benefitKeys: ["landing.motion.benefit.social", "landing.motion.benefit.editorAssets"],
    orbitLabelKey: "suite.nav.motion",
    accentColor: "#006D52",
    accentSecondary: "#0067B1",
  },
  publish: {
    moduleKey: "publish",
    eyebrowKey: "landing.publish.eyebrow",
    titleKey: "landing.publish.title",
    subtitleKey: "landing.publish.subtitle",
    descriptionKey: "landing.publish.description",
    primaryCtaKey: "landing.publish.primaryCta",
    primaryCtaHref: "/publish/start",
    secondaryCtaKey: "landing.publish.secondaryCta",
    secondaryCtaHref: "/videos",
    featureCardKeys: [
      "landing.publish.feature.social",
      "landing.publish.feature.web",
      "landing.publish.feature.print",
      "landing.publish.feature.presentation",
      "landing.publish.feature.versions",
    ],
    workflowStepKeys: [],
    examplePromptKeys: [],
    benefitKeys: ["landing.publish.benefit.delivery"],
    orbitLabelKey: "suite.nav.publish",
    accentColor: "#0067B1",
  },
  library: {
    moduleKey: "library",
    eyebrowKey: "landing.library.eyebrow",
    titleKey: "landing.library.title",
    subtitleKey: "landing.library.subtitle",
    descriptionKey: "landing.library.description",
    primaryCtaKey: "landing.library.primaryCta",
    primaryCtaHref: "/library/start",
    secondaryCtaKey: "landing.library.secondaryCta",
    secondaryCtaHref: "/library/start?upload=1",
    featureCardKeys: [
      "landing.library.feature.assets",
      "landing.library.feature.brand",
      "landing.library.feature.references",
      "landing.library.feature.variants",
      "landing.library.feature.search",
    ],
    workflowStepKeys: [],
    examplePromptKeys: [],
    benefitKeys: ["landing.library.benefit.reuse"],
    orbitLabelKey: "suite.nav.library",
    accentColor: "#006D52",
  },
  usage: {
    moduleKey: "usage",
    eyebrowKey: "landing.usage.eyebrow",
    titleKey: "landing.usage.title",
    subtitleKey: "landing.usage.subtitle",
    descriptionKey: "landing.usage.description",
    primaryCtaKey: "landing.usage.primaryCta",
    primaryCtaHref: "/usage/start",
    secondaryCtaKey: "landing.usage.secondaryCta",
    secondaryCtaHref: "/pricing",
    featureCardKeys: [
      "landing.usage.feature.credits",
      "landing.usage.feature.ads",
      "landing.usage.feature.premium",
      "landing.usage.feature.history",
      "landing.usage.feature.subscription",
    ],
    workflowStepKeys: [],
    examplePromptKeys: [],
    benefitKeys: ["landing.usage.benefit.transparency"],
    orbitLabelKey: "nav.usage",
    accentColor: "#0067B1",
    accentSecondary: "#006D52",
  },
};

export function studioProductLandingConfig(
  moduleKey: StudioProductLandingModuleKey
): StudioProductLandingConfig {
  return STUDIO_PRODUCT_LANDING_CONFIG[moduleKey];
}
