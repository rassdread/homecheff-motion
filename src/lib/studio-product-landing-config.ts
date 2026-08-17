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
  positioningKey?: TranslationKey;
  primaryCtaKey: TranslationKey;
  primaryCtaHref: string;
  secondaryCtaKey: TranslationKey;
  secondaryCtaHref: string;
  tertiaryCtaKey?: TranslationKey;
  tertiaryCtaHref?: string;
  featureCardKeys: TranslationKey[];
  workflowStepKeys: TranslationKey[];
  examplePromptKeys: TranslationKey[];
  categoryKeys?: TranslationKey[];
  exampleCreationKeys?: TranslationKey[];
  durationKeys?: TranslationKey[];
  valuePropKeys?: TranslationKey[];
  benefitKeys: TranslationKey[];
  orbitLabelKey: TranslationKey;
  accentColor: string;
  accentSecondary?: string;
  showPricingEducation?: boolean;
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
    positioningKey: "marketing.positioning.tagline",
    primaryCtaKey: "landing.editor.primaryCta",
    primaryCtaHref: "/editor/start",
    secondaryCtaKey: "marketing.cta.seeExamples",
    secondaryCtaHref: "/editor/examples",
    tertiaryCtaKey: "marketing.cta.learnMore",
    tertiaryCtaHref: "/hoe-het-werkt",
    featureCardKeys: [
      "landing.editor.feature.imageEditing",
      "landing.editor.feature.imageFusion",
      "landing.editor.feature.futureSelf",
      "landing.editor.feature.transformations",
      "landing.editor.feature.characters",
      "landing.editor.feature.exportHandoff",
    ],
    categoryKeys: [
      "landing.editor.category.people",
      "landing.editor.category.animals",
      "landing.editor.category.fashion",
      "landing.editor.category.products",
      "landing.editor.category.brands",
      "landing.editor.category.characters",
      "landing.editor.category.futureSelf",
      "landing.editor.category.transformations",
    ],
    exampleCreationKeys: [
      "landing.editor.example.outfit",
      "landing.editor.example.hybrid",
      "landing.editor.example.timeline",
      "landing.editor.example.mascot",
    ],
    valuePropKeys: [
      "landing.editor.valueProp.futureSelf",
      "landing.editor.valueProp.outfit",
      "landing.editor.valueProp.animalFusion",
      "landing.editor.valueProp.characterUpgrade",
    ],
    workflowStepKeys: [
      "landing.editor.step.upload",
      "landing.editor.step.plan",
      "landing.editor.step.generate",
      "landing.editor.step.deliver",
    ],
    examplePromptKeys: [
      "landing.editor.prompt.outfit",
      "landing.editor.prompt.futureSelf",
      "landing.editor.prompt.mascot",
    ],
    benefitKeys: [
      "landing.editor.benefit.noPhotoshop",
      "landing.editor.benefit.structured",
      "landing.editor.benefit.variants",
    ],
    showPricingEducation: true,
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
    positioningKey: "marketing.positioning.tagline",
    primaryCtaKey: "landing.studio.primaryCta",
    primaryCtaHref: "/studio/storyboards/new",
    secondaryCtaKey: "marketing.cta.seeExamples",
    secondaryCtaHref: "/studio/examples",
    tertiaryCtaKey: "marketing.cta.learnMore",
    tertiaryCtaHref: "/hoe-werkt-studio",
    featureCardKeys: [
      "landing.studio.feature.stories",
      "landing.studio.feature.campaigns",
      "landing.studio.feature.episodes",
      "landing.studio.feature.storyboard",
      "landing.studio.feature.assets",
      "landing.studio.feature.integrations",
    ],
    workflowStepKeys: [
      "landing.studio.step.concept",
      "landing.studio.step.scenes",
      "landing.studio.step.production",
      "landing.studio.step.publish",
    ],
    examplePromptKeys: [],
    valuePropKeys: [
      "landing.studio.valueProp.hub",
      "landing.studio.valueProp.campaigns",
      "landing.studio.valueProp.motionPublish",
    ],
    benefitKeys: [
      "landing.studio.benefit.pipeline",
      "landing.studio.benefit.consistency",
    ],
    showPricingEducation: true,
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
    positioningKey: "marketing.positioning.tagline",
    primaryCtaKey: "landing.motion.primaryCta",
    primaryCtaHref: "/motion/start",
    secondaryCtaKey: "marketing.cta.seeExamples",
    secondaryCtaHref: "/motion/examples",
    tertiaryCtaKey: "marketing.cta.learnMore",
    tertiaryCtaHref: "/hoe-het-werkt",
    featureCardKeys: [
      "landing.motion.feature.imageToVideo",
      "landing.motion.feature.transformation",
      "landing.motion.feature.scene",
      "landing.motion.feature.socialClips",
      "landing.motion.feature.campaign",
      "landing.motion.feature.studioProduction",
    ],
    durationKeys: [
      "landing.motion.duration.3",
      "landing.motion.duration.5",
      "landing.motion.duration.8",
    ],
    exampleCreationKeys: [
      "landing.motion.example.generatedImages",
      "landing.motion.example.sequence",
      "landing.motion.example.social",
    ],
    workflowStepKeys: [],
    examplePromptKeys: [],
    benefitKeys: ["landing.motion.benefit.social", "landing.motion.benefit.editorAssets"],
    showPricingEducation: true,
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
    positioningKey: "marketing.positioning.tagline",
    primaryCtaKey: "landing.publish.primaryCta",
    primaryCtaHref: "/publish/start",
    secondaryCtaKey: "marketing.cta.seeExamples",
    secondaryCtaHref: "/publish/examples",
    tertiaryCtaKey: "marketing.cta.learnMore",
    tertiaryCtaHref: "/hoe-het-werkt",
    featureCardKeys: [
      "landing.publish.feature.headlines",
      "landing.publish.feature.subtitles",
      "landing.publish.feature.voiceover",
      "landing.publish.feature.music",
      "landing.publish.feature.branding",
      "landing.publish.feature.exports",
    ],
    exampleCreationKeys: [
      "landing.publish.example.social",
      "landing.publish.example.print",
      "landing.publish.example.finishedVideo",
    ],
    workflowStepKeys: [],
    examplePromptKeys: [],
    benefitKeys: ["landing.publish.benefit.delivery"],
    showPricingEducation: true,
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
