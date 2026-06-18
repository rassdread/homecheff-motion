import type { SeoContentLink, SeoContentPage, SeoContentSection, SeoFaq } from "@/lib/seo/seo-content-types";
import {
  buildUniqueProductionLineSection,
  type ProductionLineContext,
} from "@/lib/seo/seo-content-production-line";

const TRADEMARK_DISCLAIMER =
  "HomeCheff Studio is not affiliated with the compared product. All trademarks belong to their respective owners. This page is an independent comparison for creators evaluating workflow fit.";

export type AlternativeWave1Config = {
  slug: string;
  competitor: string;
  category: string;
  intro: string;
  whoCompetitorFor: string;
  homecheffDifference: string;
  whenUseCompetitor: string;
  whenUseHomecheff: string;
  workflowComparison: string;
  practicalExample: string;
  limitations: string;
  competitorStrength: string;
  homecheffStrength: string;
  pricingNote: string;
  migrationTip: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
  relatedGuides: SeoContentLink[];
  comparisonRows: Array<{ feature: string; homecheff: string; other: string }>;
};

export function buildAlternativeWave1Page(config: AlternativeWave1Config): SeoContentPage {
  const title = `${config.competitor} Alternative for AI Video Production`;
  const h1 = `HomeCheff Studio as a ${config.competitor} alternative`;
  const metaDescription = `Compare HomeCheff Studio vs ${config.competitor} for ${config.category}. Story-first AI video with voice, subtitles, translation, and publishing.`;

  const sections: SeoContentSection[] = [
    {
      heading: `Who ${config.competitor} is for`,
      paragraphs: [config.whoCompetitorFor, config.competitorStrength],
    },
    {
      heading: "Where HomeCheff Studio differs",
      paragraphs: [config.homecheffDifference, config.homecheffStrength],
      bullets: [
        "Storyboard-first planning in Studio",
        "Reusable characters and worlds in Library",
        "Integrated voice, subtitles, and translation",
        "Multi-format Publish from one project",
      ],
    },
    {
      heading: `When to keep using ${config.competitor}`,
      paragraphs: [config.whenUseCompetitor, config.limitations],
    },
    {
      heading: "When HomeCheff Studio is the better fit",
      paragraphs: [config.whenUseHomecheff, config.practicalExample],
    },
    {
      heading: "Workflow comparison",
      paragraphs: [config.workflowComparison, config.migrationTip],
    },
    {
      heading: "Pricing and credits mindset",
      paragraphs: [config.pricingNote, "Open /pricing for live credit tables. Sign up at /signup to pilot one storyboard before changing your whole stack."],
    },
    buildUniqueProductionLineSection({ ...config.productionLine, locale: "en" }),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Can HomeCheff replace ${config.competitor}?`,
      answer: `For multi-scene video with voice and publishing, often yes. For tasks where ${config.competitor} is uniquely strong, many teams use both.`,
    },
    {
      question: `Is learning HomeCheff harder than ${config.competitor}?`,
      answer: "HomeCheff adds storyboard structure upfront, which saves time when you ship variants or series.",
    },
    {
      question: "Does HomeCheff export for social platforms?",
      answer: "Yes. Publish supports common aspect ratios after your storyboard and motion renders are approved.",
    },
    {
      question: "How do I budget credits?",
      answer: "Each studio action uses credits. See /pricing before batch motion renders.",
    },
    {
      question: "Where should I start?",
      answer: `Create a free account at /signup, then ${config.studioCta.label} at ${config.studioCta.href}.`,
    },
  ];

  return {
    slug: config.slug,
    path: `/alternatives/${config.slug}`,
    title,
    metaDescription,
    h1,
    eyebrow: "Comparison",
    intro: config.intro,
    sections,
    comparisonTable: { otherLabel: config.competitor, rows: config.comparisonRows },
    faqs,
    internalLinks: [
      { href: "/alternatives", label: "All alternatives" },
      { href: "/pricing", label: "Pricing" },
      { href: "/guides", label: "Guides" },
      ...config.relatedGuides,
    ],
    studioCta: config.studioCta,
    disclaimers: [TRADEMARK_DISCLAIMER],
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/alternatives", label: "Alternatives" },
      { href: `/alternatives/${config.slug}`, label: title },
    ],
  };
}

export type GuideWave1Config = {
  slug: string;
  title: string;
  h1: string;
  eyebrow: string;
  intro: string;
  steps: Array<{ heading: string; paragraphs: string[] }>;
  mistakes: string[];
  mistakesFix: string;
  exampleProject: string;
  studioEditorMotion: string;
  creditsNote: string;
  creditsSignup: string;
  publishingTips: string;
  publishIterate: string;
  productionLine: ProductionLineContext;
  faqs: SeoFaq[];
  studioCta: SeoContentLink;
  internalLinks: SeoContentLink[];
};

export function buildGuideWave1Page(config: GuideWave1Config): SeoContentPage {
  const metaDescription = config.intro.slice(0, 155);

  const sections: SeoContentSection[] = [
    {
      heading: "Wat je gaat maken",
      paragraphs: [config.exampleProject, config.studioEditorMotion],
    },
    ...config.steps.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs })),
    {
      heading: "Veelgemaakte fouten",
      paragraphs: [config.mistakesFix],
      bullets: config.mistakes,
    },
    {
      heading: "Credits en prijzen",
      paragraphs: [config.creditsNote, config.creditsSignup],
    },
    {
      heading: "Publicatietips",
      paragraphs: [config.publishingTips, config.publishIterate],
    },
    buildUniqueProductionLineSection({ ...config.productionLine, locale: "nl" }),
  ];

  return {
    slug: config.slug,
    path: `/guides/${config.slug}`,
    title: config.title,
    metaDescription,
    h1: config.h1,
    eyebrow: config.eyebrow,
    intro: config.intro,
    sections,
    faqs: config.faqs,
    internalLinks: [
      { href: "/guides", label: "Alle gidsen" },
      { href: "/pricing", label: "Prijzen" },
      ...config.internalLinks,
    ],
    studioCta: config.studioCta,
    locale: "nl",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/guides", label: "Gidsen" },
      { href: `/guides/${config.slug}`, label: config.h1 },
    ],
  };
}

export type WorkflowWave1Config = {
  slug: string;
  title: string;
  h1: string;
  intro: string;
  audienceWorkflow: string;
  dailyUseCases: string[];
  soloTeam: string;
  libraryUse: string;
  voiceSubtitlePublish: string;
  conversionPath: string;
  productionLine: ProductionLineContext;
  faqs: SeoFaq[];
  linkedGuides: SeoContentLink[];
  linkedAlternatives: SeoContentLink[];
  studioCta: SeoContentLink;
};

export function buildWorkflowWave1Page(config: WorkflowWave1Config): SeoContentPage & {
  linkedGuides: SeoContentLink[];
  linkedAlternatives: SeoContentLink[];
  productLinks: SeoContentLink[];
} {
  const metaDescription = config.intro.slice(0, 155);

  const sections: SeoContentSection[] = [
    {
      heading: "Workflow voor jouw rol",
      paragraphs: [config.audienceWorkflow, config.soloTeam],
      bullets: config.dailyUseCases,
    },
    {
      heading: "Library en hergebruik",
      paragraphs: [config.libraryUse, config.conversionPath],
    },
    {
      heading: "Stem, ondertitels, vertaling en publicatie",
      paragraphs: [config.voiceSubtitlePublish, "Exporteer vanuit Publish in het juiste formaat per kanaal."],
    },
    buildUniqueProductionLineSection({ ...config.productionLine, locale: "nl" }),
  ];

  const productLinks: SeoContentLink[] = [
    { href: "/studio", label: "Studio" },
    { href: "/editor", label: "Editor" },
    { href: "/pricing", label: "Prijzen" },
  ];

  return {
    slug: config.slug,
    path: `/workflows/${config.slug}`,
    title: config.title,
    metaDescription,
    h1: config.h1,
    eyebrow: "Workflow",
    intro: config.intro,
    sections,
    faqs: config.faqs,
    internalLinks: [...config.linkedGuides, ...config.linkedAlternatives, ...productLinks],
    linkedGuides: config.linkedGuides,
    linkedAlternatives: config.linkedAlternatives,
    productLinks,
    studioCta: config.studioCta,
    locale: "nl",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/workflows", label: "Workflows" },
      { href: `/workflows/${config.slug}`, label: config.h1 },
    ],
  };
}
