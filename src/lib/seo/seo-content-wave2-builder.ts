import type { SeoContentLink, SeoContentPage, SeoContentSection, SeoFaq } from "@/lib/seo/seo-content-types";
import {
  buildUniqueProductionLineSection,
  type ProductionLineContext,
} from "@/lib/seo/seo-content-production-line";

const TRADEMARK_DISCLAIMER =
  "HomeCheff Studio is not affiliated with the compared product. All trademarks belong to their respective owners. This page is an independent comparison for creators evaluating workflow fit.";

export function countSeoContentWords(page: SeoContentPage): number {
  const chunks: string[] = [page.intro, page.metaDescription, page.title];
  for (const section of page.sections) {
    chunks.push(section.heading, ...section.paragraphs);
    if (section.bullets) chunks.push(...section.bullets);
  }
  if (page.comparisonTable) {
    for (const row of page.comparisonTable.rows) {
      chunks.push(row.feature, row.homecheff, row.other);
    }
  }
  for (const faq of page.faqs) {
    chunks.push(faq.question, faq.answer);
  }
  return chunks.join(" ").split(/\s+/).filter((w) => w.length > 0).length;
}

export type AlternativeWave2Config = {
  slug: string;
  competitor: string;
  category: string;
  competitorStrength: string;
  homecheffStrength: string;
  idealCompetitorUser: string;
  idealHomecheffUser: string;
  migrationTip: string;
  workflowScenario: string;
  featureDeepDive: string;
  growthTradeOff: string;
  pipelineHandoff: string;
  homecheffFitDetail: string;
  migrationPilot: string;
  pricingPhilosophy: string;
  qualityNote: string;
  iterationInsight: string;
  featureResolution: string;
  checklistNarrative: string;
  checklistOutcome: string;
  hybridWorkflow: string;
  hybridDocumentation: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
  relatedGuides: SeoContentLink[];
};

export function buildAlternativeWave2Page(config: AlternativeWave2Config): SeoContentPage {
  const title = `${config.competitor} Alternative — AI Video`;
  const h1 = `HomeCheff Studio as a ${config.competitor} alternative`;
  const metaDescription = `Compare HomeCheff Studio vs ${config.competitor} for ${config.category}. Story-first AI video with voice, subtitles & publish. Start free.`;

  const intro = `${config.competitor} and HomeCheff Studio solve overlapping but not identical problems in ${config.category.toLowerCase()}. This guide helps you decide when a category-native tool is enough — and when you need a full production line from storyboard to published video with reusable characters, voices, and translations. We cover strengths, migration paths, pricing mindset, and a practical checklist you can run on a real campaign this week. ${config.homecheffStrength}`;

  const sections: SeoContentSection[] = [
    {
      heading: `Understanding ${config.competitor} in the ${config.category} space`,
      paragraphs: [
        `${config.competitor} has become a recognizable name for teams who need ${config.category.toLowerCase()} capabilities. ${config.competitorStrength} Many creators start there because the onboarding is familiar and the first output arrives quickly.`,
        config.growthTradeOff,
      ],
    },
    {
      heading: "Where HomeCheff Studio takes a different path",
      paragraphs: [
        `HomeCheff Studio is built as a connected studio: Idea → World → Characters → Voices → Scenes → Video → Translation → Publishing. ${config.homecheffStrength}`,
        config.pipelineHandoff,
      ],
      bullets: [
        "Storyboard-first planning before rendering clips",
        "Reusable character identity and worlds in Library",
        "Integrated voice, subtitles, and translation versions",
        "Transparent Studio Credits pricing on /pricing",
      ],
    },
    {
      heading: `Who should stay with ${config.competitor}`,
      paragraphs: [
        config.idealCompetitorUser,
        `If your team already invested in templates, plugins, or vendor relationships around ${config.competitor}, keep using it where it is strongest. HomeCheff is not asking you to rip out a working stack overnight.`,
      ],
    },
    {
      heading: "Who should evaluate HomeCheff Studio",
      paragraphs: [
        config.idealHomecheffUser,
        config.homecheffFitDetail,
      ],
    },
    {
      heading: "Practical migration without losing momentum",
      paragraphs: [
        config.migrationTip,
        config.migrationPilot,
      ],
    },
    {
      heading: "Pricing philosophy: clips vs production actions",
      paragraphs: [
        config.pricingPhilosophy,
      ],
    },
    {
      heading: "Quality, brand safety, and ownership",
      paragraphs: [
        config.qualityNote,
      ],
    },
    {
      heading: `A realistic week: ${config.competitor} vs a HomeCheff production line`,
      paragraphs: [
        config.workflowScenario,
        config.iterationInsight,
      ],
    },
    {
      heading: `Feature depth: what ${config.competitor} users often ask about`,
      paragraphs: [
        config.featureDeepDive,
        config.featureResolution,
      ],
    },
    {
      heading: "Evaluation checklist before you switch",
      paragraphs: [
        config.checklistNarrative,
        config.checklistOutcome,
      ],
      bullets: [
        "Character consistency across scenes",
        "Voice and subtitles in the same project",
        "Multi-format Publish exports",
        "Transparent Studio Credits",
        "Library reuse for the next episode",
      ],
    },
    {
      heading: `Integration reality: ${config.competitor} in a hybrid stack`,
      paragraphs: [
        config.hybridWorkflow,
        config.hybridDocumentation,
      ],
    },
    buildUniqueProductionLineSection({ ...config.productionLine, locale: "en" }),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Can HomeCheff Studio replace ${config.competitor} completely?`,
      answer: `For story-driven video production with multiple scenes and versions, often yes. For workflows where ${config.competitor} is uniquely strong, many teams use both tools.`,
    },
    {
      question: `Is HomeCheff harder to learn than ${config.competitor}?`,
      answer: `HomeCheff asks you to plan scenes first, which adds structure upfront and saves time across variants. ${config.competitor} may feel faster for a single one-off export.`,
    },
    {
      question: "Does HomeCheff support social and web formats?",
      answer: "Yes. Publish exports versions for common aspect ratios and channels after your storyboard and motion renders are approved.",
    },
    {
      question: "How do credits compare to a subscription?",
      answer: "Credits charge per studio action. Subscriptions can reduce credit pack cost. See /pricing for live numbers.",
    },
    {
      question: "Where do I start?",
      answer: `Create a free account at /signup, then follow the Studio CTA on this page: ${config.studioCta.label}.`,
    },
  ];

  const internalLinks: SeoContentLink[] = [
    { href: "/alternatives", label: "All alternatives" },
    { href: "/guides", label: "Creator guides" },
    { href: "/workflows/marketing", label: "Marketing workflow" },
    ...config.relatedGuides,
    { href: "/alternatives/canva", label: "Canva alternative" },
    { href: "/alternatives/runway", label: "Runway alternative" },
  ];

  return {
    slug: config.slug,
    path: `/alternatives/${config.slug}`,
    title,
    metaDescription,
    h1,
    eyebrow: "Comparison",
    intro,
    sections,
    comparisonTable: {
      otherLabel: config.competitor,
      rows: [
        { feature: "Primary category", homecheff: "AI production studio", other: config.category },
        { feature: "Story planning", homecheff: "Studio storyboards", other: "Varies by product" },
        { feature: "Character consistency", homecheff: "Library + identity", other: "Often per-project" },
        { feature: "Voice & subtitles", homecheff: "Integrated pipeline", other: "Varies" },
        { feature: "Best fit", homecheff: "Series & campaigns", other: "Category-native tasks" },
      ],
    },
    faqs,
    internalLinks,
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

export type GuideWave2Config = {
  slug: string;
  title: string;
  h1: string;
  eyebrow: string;
  topic: string;
  audience: string;
  outcome: string;
  studioPath: string;
  editorStep: string;
  studioStep: string;
  motionStep: string;
  publishStep: string;
  gearAndAssets: string;
  promotionTips: string;
  preflightPlanning: string;
  preflightReferences: string;
  productionOutcome: string;
  repeatableMethod: string;
  storyBeatDiscipline: string;
  studioBriefing: string;
  projectNaming: string;
  voiceSubtitleTranslation: string;
  commonMistakeStoryboarding: string;
  commonMistakeFix: string;
  seriesScaling: string;
  batchingRhythm: string;
  budgetBatching: string;
  stillPreviewAdvice: string;
  qualityPass: string;
  qualityGate: string;
  editorSupport: string;
  studioDirection: string;
  motionRender: string;
  publishExport: string;
  libraryStorage: string;
  promotionTracking: string;
  keywordMeaning: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
  relatedGuides: SeoContentLink[];
};

export function buildGuideWave2Page(config: GuideWave2Config): SeoContentPage {
  const metaDescription = `Learn ${config.topic.toLowerCase()} with HomeCheff Studio — storyboards, AI motion, voice, subtitles, and publishing in one workflow.`;

  const intro = `${config.topic} is easier when you treat video as a planned production, not a single AI prompt. HomeCheff Studio connects ${config.studioPath} so ${config.audience} can ship professional results without a fragmented toolchain. ${config.outcome} This guide is written for repeatable weekly output — not a one-time experiment — and assumes you will reuse Library assets on the next project.`;

  const sections: SeoContentSection[] = [
    {
      heading: "What this guide really means",
      paragraphs: [config.keywordMeaning],
    },
    {
      heading: "Before you open Studio — pre-flight checklist",
      paragraphs: [
        config.preflightPlanning,
        config.preflightReferences,
      ],
      bullets: [
        "One-sentence viewer goal",
        "Target runtime and aspect ratio",
        "Brand references in Editor",
        "Scene count target (3–9 for first project)",
        "Voice tone decided",
        "Subtitle requirement confirmed",
        "Credit budget checked on /pricing",
        "Publish channel list defined",
      ],
    },
    {
      heading: "What you will produce",
      paragraphs: [
        config.productionOutcome,
        config.repeatableMethod,
      ],
    },
    {
      heading: "Step 1 — Clarify the story beat",
      paragraphs: [
        config.storyBeatDiscipline,
        config.studioBriefing,
        config.projectNaming,
      ],
    },
    {
      heading: "Step 2 — Prepare visuals in Editor",
      paragraphs: [config.editorStep, config.editorSupport],
    },
    {
      heading: "Step 3 — Build scenes in Studio",
      paragraphs: [config.studioStep, config.studioDirection],
    },
    {
      heading: "Step 4 — Animate in Motion",
      paragraphs: [config.motionStep, config.motionRender],
    },
    {
      heading: "Step 5 — Voice, subtitles, and translation",
      paragraphs: [config.voiceSubtitleTranslation],
    },
    {
      heading: "Step 6 — Publish and measure",
      paragraphs: [config.publishStep, config.publishExport],
    },
    {
      heading: "Common mistakes to avoid",
      paragraphs: [
        config.commonMistakeStoryboarding,
        config.commonMistakeFix,
      ],
      bullets: [
        "Define one audience and one goal per video",
        "Keep scene count small for first projects",
        "Reuse Library assets across episodes",
        "Check /pricing before batch renders",
      ],
    },
    {
      heading: "Assets, references, and preparation",
      paragraphs: [config.gearAndAssets, config.libraryStorage],
    },
    {
      heading: "Distribution and iteration",
      paragraphs: [config.promotionTips, config.promotionTracking],
    },
    {
      heading: "Scaling to a content series",
      paragraphs: [
        config.seriesScaling,
        config.batchingRhythm,
      ],
    },
    {
      heading: "Credit budgeting and batching",
      paragraphs: [
        config.budgetBatching,
        config.stillPreviewAdvice,
      ],
    },
    {
      heading: "Quality review before Publish",
      paragraphs: [
        config.qualityPass,
        config.qualityGate,
      ],
    },
    buildUniqueProductionLineSection({ ...config.productionLine, locale: "en" }),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `How long does it take to ${config.topic.toLowerCase()}?`,
      answer: `A first project with five scenes often takes one to three hours including revisions. Experienced ${config.audience} go faster once Library assets exist for ${config.topic.toLowerCase()}.`,
    },
    {
      question: "Do I need video editing experience?",
      answer: "No. HomeCheff is storyboard-first. You do not need timeline editing skills to ship.",
    },
    {
      question: "What does it cost?",
      answer: "Each studio action uses credits. See /pricing for current costs for images, motion, and voice.",
    },
    {
      question: "Can I repurpose one project for multiple channels?",
      answer: "Yes. Create version exports for TikTok, Reels, YouTube, and web from the same storyboard.",
    },
    {
      question: "What is the first click?",
      answer: `Start at ${config.studioCta.href} — ${config.studioCta.label}.`,
    },
  ];

  return {
    slug: config.slug,
    path: `/guides/${config.slug}`,
    title: config.title,
    metaDescription,
    h1: config.h1,
    eyebrow: config.eyebrow,
    intro,
    sections,
    faqs,
    internalLinks: [
      { href: "/guides", label: "All guides" },
      { href: "/workflows/marketing", label: "Marketing workflow" },
      { href: "/pricing", label: "Pricing" },
      ...config.relatedGuides,
    ],
    studioCta: config.studioCta,
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/guides", label: "Guides" },
      { href: `/guides/${config.slug}`, label: config.h1 },
    ],
  };
}

export type WorkflowWave2Page = SeoContentPage & {
  linkedGuides: SeoContentLink[];
  linkedAlternatives: SeoContentLink[];
  productLinks: SeoContentLink[];
};

export type WorkflowWave2Config = {
  slug: string;
  title: string;
  h1: string;
  role: string;
  painPoint: string;
  studioValue: string;
  typicalDeliverables: string[];
  clientScenario: string;
  toolingComparison: string;
  introPipeline: string;
  whyVideoConstraint: string;
  mondayToFridayCadence: string;
  productionLineFramework: string;
  productionLineUnification: string;
  collaborationReuse: string;
  changeManagement: string;
  measurementDiscipline: string;
  toolingMindset: string;
  comparisonBrowseHint: string;
  stakeholderReviewFlow: string;
  hybridStackGuidance: string;
  adoptionPlan: string;
  adoptionConfidence: string;
  deliverableMomentum: string;
  governanceApprovals: string;
  complianceHistory: string;
  legacyBoundary: string;
  toolingReevaluation: string;
  supportPath: string;
  libraryReuseRule: string;
  deliverablePlaybook: string;
  channelExpansion: string;
  scalingPlaybook: string;
  roleDeepDive: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
  linkedGuideSlugs: Array<{ slug: string; label: string }>;
  linkedAlternativeSlugs: Array<{ slug: string; label: string }>;
  productLinks: SeoContentLink[];
};

export function buildWorkflowWave2Page(config: WorkflowWave2Config): WorkflowWave2Page {
  const metaDescription = `HomeCheff workflow for ${config.role}: storyboards, AI motion, voice & publish in one line. Reusable assets, subtitles, transparent credits. Start free.`;

  const deliverablePlaybooks = config.deliverablePlaybook;

  const intro = config.introPipeline;

  const sections: SeoContentSection[] = [
    {
      heading: `Why ${config.role} teams choose video`,
      paragraphs: [
        `${config.role} professionals compete for attention. Video communicates faster than text alone when trust, emotion, or demonstration matters. ${config.painPoint}`,
        config.whyVideoConstraint,
      ],
    },
    {
      heading: "How HomeCheff maps to your week",
      paragraphs: [
        config.studioValue,
        config.mondayToFridayCadence,
      ],
      bullets: config.typicalDeliverables,
    },
    {
      heading: "Production line for this role",
      paragraphs: [
        config.productionLineFramework,
        config.productionLineUnification,
      ],
    },
    {
      heading: "Collaboration and reuse",
      paragraphs: [
        config.collaborationReuse,
        config.changeManagement,
      ],
    },
    {
      heading: "Measuring success",
      paragraphs: [
        config.measurementDiscipline,
      ],
    },
    {
      heading: "Tools comparison mindset",
      paragraphs: [
        config.toolingMindset,
        config.comparisonBrowseHint,
      ],
    },
    {
      heading: "Client and stakeholder scenario",
      paragraphs: [
        config.clientScenario,
        config.stakeholderReviewFlow,
      ],
    },
    {
      heading: "Stack comparison for this role",
      paragraphs: [
        config.toolingComparison,
        config.hybridStackGuidance,
      ],
    },
    {
      heading: "90-day adoption plan",
      paragraphs: [
        config.adoptionPlan,
        config.adoptionConfidence,
      ],
      bullets: [
        "Week 1–2: first storyboard shipped",
        "Week 3–4: Library populated",
        "Month 2: localized or A/B variant",
        "Month 3: templated series",
      ],
    },
    {
      heading: "Deliverable playbooks",
      paragraphs: [
        deliverablePlaybooks,
        config.deliverableMomentum,
      ],
    },
    {
      heading: "Roles, approvals, and governance",
      paragraphs: [
        config.governanceApprovals,
        config.complianceHistory,
      ],
    },
    {
      heading: "When to keep legacy tools",
      paragraphs: [
        config.legacyBoundary,
        config.toolingReevaluation,
      ],
    },
    {
      heading: "Support and learning path",
      paragraphs: [
        config.supportPath,
        config.libraryReuseRule,
      ],
    },
    {
      heading: "Channel and scaling strategy",
      paragraphs: [config.channelExpansion, config.scalingPlaybook],
    },
    {
      heading: `Sustaining the ${config.slug} workflow`,
      paragraphs: [config.roleDeepDive],
    },
    buildUniqueProductionLineSection({ ...config.productionLine, locale: "en" }),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Is HomeCheff built for ${config.role} work?`,
      answer: `Yes. This workflow hub collects guides and comparisons relevant to ${config.role} deliverables including ${config.typicalDeliverables.slice(0, 2).join(" and ")}.`,
    },
    {
      question: "Do I need a team?",
      answer: `Solo ${config.role} professionals and small teams use the same pipeline. Projects scale when you add collaborators later.`,
    },
    {
      question: "What should I make first?",
      answer: `Start with one deliverable — ${config.typicalDeliverables[0]} — as a five-scene storyboard with subtitles and one Publish export.`,
    },
    {
      question: "How do I control brand?",
      answer: "Library stores approved assets. Studio keeps characters on-model across scenes.",
    },
    {
      question: "Free trial?",
      answer: "Sign up at /signup and review credits on /pricing before batch renders.",
    },
  ];

  const linkedGuides = config.linkedGuideSlugs.map((g) => ({
    href: `/guides/${g.slug}`,
    label: g.label,
  }));
  const linkedAlternatives = config.linkedAlternativeSlugs.map((a) => ({
    href: `/alternatives/${a.slug}`,
    label: a.label,
  }));

  return {
    slug: config.slug,
    path: `/workflows/${config.slug}`,
    title: config.title,
    metaDescription,
    h1: config.h1,
    eyebrow: "Workflow",
    intro,
    sections,
    faqs,
    internalLinks: [...linkedGuides, ...linkedAlternatives, ...config.productLinks],
    linkedGuides,
    linkedAlternatives,
    productLinks: config.productLinks,
    studioCta: config.studioCta,
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/workflows", label: "Workflows" },
      { href: `/workflows/${config.slug}`, label: config.h1 },
    ],
  };
}
