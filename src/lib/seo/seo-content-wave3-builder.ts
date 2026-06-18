import type { SeoContentLink, SeoContentPage, SeoContentSection, SeoFaq } from "@/lib/seo/seo-content-types";
import { buildUniqueProductionLineSection, type ProductionLineContext } from "@/lib/seo/seo-content-production-line";

export { countSeoContentWords } from "@/lib/seo/seo-content-wave2-builder";

export type LocationWave3Config = {
  slug: string;
  city: string;
  region: string;
  localAngle: string;
  audience: string;
  exampleProject: string;
  productionCompetition: string;
  studioPipeline: string;
  studioLocalAssets: string;
  exampleIteration: string;
  collaborationProjects: string;
  collaborationEdits: string;
  pricingBatch: string;
  pricingPilot: string;
  startSignup: string;
  startGuides: string;
  qualityDirect: string;
  qualityComparison: string;
  scaleTemplate: string;
  scaleReuse: string;
  discoveryAlgorithms: string;
  discoveryGeo: string;
  toolTemplate: string;
  toolHybrid: string;
  adoptionMonths: string;
  adoptionCredits: string;
  evalChecklist: string;
  evalPilot: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
};

export function buildLocationWave3Page(config: LocationWave3Config): SeoContentPage {
  const title = `AI Video Generator in ${config.city}`;
  const h1 = `AI video production in ${config.city}`;
  const metaDescription = `Create AI video in ${config.city} with HomeCheff Studio — storyboards, motion, voice, subtitles, and publishing for ${config.audience}.`;

  const intro = `${config.city} creators and businesses use video to stand out in ${config.region}. HomeCheff Studio is a browser-based production line — no local studio rental required — that turns ideas into storyboarded videos with AI motion, voice, and multi-channel exports. ${config.localAngle} Whether you are a freelancer in the city center or a brand team in the wider region, you can plan scenes, reuse Library assets, and publish this week.`;

  const sections: SeoContentSection[] = [
    {
      heading: `Why ${config.city} teams invest in video`,
      paragraphs: [
        `${config.audience} in ${config.city} compete for attention on social feeds, local search, and event promotion. Video communicates trust faster than static posts when you need to explain a service, launch an offer, or tell a neighborhood story.`,
        config.productionCompetition,
      ],
    },
    {
      heading: "How HomeCheff Studio works for local creators",
      paragraphs: [
        config.studioPipeline,
        config.studioLocalAssets,
      ],
      bullets: [
        "Browser-based — work from home, office, or co-working space",
        "Storyboard approval before spending motion credits",
        "Subtitles for silent mobile viewing",
        "Transparent Studio Credits on /pricing",
      ],
    },
    {
      heading: `Example project: ${config.exampleProject}`,
      paragraphs: [
        `Imagine ${config.exampleProject}. You brief five scenes in Studio: hook, context, demonstration, proof, call to action. Assign narration, generate subtitles, render motion only on scenes that need movement, and Publish a 9:16 cut for local social plus a 16:9 cut for your website.`,
        config.exampleIteration,
      ],
    },
    {
      heading: "Collaboration without a local agency retainer",
      paragraphs: [config.collaborationProjects, config.collaborationEdits],
    },
    {
      heading: "Pricing and planning credits",
      paragraphs: [config.pricingBatch, config.pricingPilot],
    },
    {
      heading: `Getting started in ${config.city}`,
      paragraphs: [config.startSignup, config.startGuides],
    },
    {
      heading: "Quality, brand, and compliance",
      paragraphs: [config.qualityDirect, config.qualityComparison],
    },
    {
      heading: "Scale beyond one video",
      paragraphs: [config.scaleTemplate, config.scaleReuse],
    },
    {
      heading: `Local discovery and ${config.city} audiences`,
      paragraphs: [config.discoveryAlgorithms, config.discoveryGeo],
    },
    {
      heading: "Tool comparison for local marketers",
      paragraphs: [config.toolTemplate, config.toolHybrid],
    },
    {
      heading: "90-day adoption plan",
      paragraphs: [config.adoptionMonths, config.adoptionCredits],
      bullets: [
        "Week 1–2: first storyboard live",
        "Week 3–4: Library populated with brand assets",
        "Month 2: vertical + widescreen variants",
        "Month 3: templated seasonal series",
      ],
    },
    {
      heading: "Evaluation checklist",
      paragraphs: [config.evalChecklist, config.evalPilot],
    },
    buildUniqueProductionLineSection(config.productionLine),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Do I need to live in ${config.city} to use HomeCheff?`,
      answer: "No. HomeCheff runs in the browser worldwide. This page speaks to creators and businesses serving the local market.",
    },
    {
      question: `Can I use ${config.city} photos in my videos?`,
      answer: "Yes. Upload your own photography and reference images in Editor. You must have rights to assets you upload.",
    },
    {
      question: "Is this a replacement for a film crew?",
      answer: "For many social and marketing deliverables, yes. For large live events, many teams combine both.",
    },
    {
      question: "What does it cost?",
      answer: "Studio actions use credits. See /pricing for current tables before batch motion renders.",
    },
    {
      question: "First step?",
      answer: `Create a free account at /signup, then ${config.studioCta.label} at ${config.studioCta.href}. Review /pricing before batch motion renders.`,
    },
  ];

  return {
    slug: config.slug,
    path: `/locations/${config.slug}`,
    title,
    metaDescription,
    h1,
    eyebrow: "Location",
    intro,
    sections,
    faqs,
    internalLinks: [
      { href: "/locations", label: "All locations" },
      { href: "/guides/how-to-create-local-business-videos", label: "Local business videos" },
      { href: "/use-cases/for-local-governments", label: "Government use cases" },
      { href: "/workflows/local-business-owner", label: "Local business workflow" },
      { href: "/pricing", label: "Pricing" },
    ],
    studioCta: config.studioCta,
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/locations", label: "Locations" },
      { href: `/locations/${config.slug}`, label: h1 },
    ],
  };
}

export type UseCaseWave3Config = {
  slug: string;
  name: string;
  sector: string;
  painPoint: string;
  solution: string;
  deliverables: string[];
  complianceNote: string;
  stakeholderPressure: string;
  storyboardBenefit: string;
  productionLineDetail: string;
  complianceAssets: string;
  deliverablesExpansion: string;
  deliverablesReuse: string;
  iterationMeasurement: string;
  iterationFinance: string;
  gettingStartedAction: string;
  gettingStartedBrowse: string;
  humanVideography: string;
  hybridCapture: string;
  trainingRotating: string;
  trainingShotList: string;
  creditProcurement: string;
  creditPilot: string;
  rolloutMonth: string;
  rolloutCompliance: string;
  stackComparison: string;
  stackBrowse: string;
  stakeholderBoard: string;
  stakeholderResponsive: string;
  accessibilitySubtitles: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
};

export function buildUseCaseWave3Page(config: UseCaseWave3Config): SeoContentPage {
  const title = `AI Video for ${config.name}`;
  const h1 = `HomeCheff Studio for ${config.name}`;
  const metaDescription = `${config.sector} teams: ship ${config.name} video with storyboards, AI motion, voice & publish. ${config.deliverables[0] ?? "Repeatable campaigns"}. Compare pricing — start free.`;

  const intro = `${config.name} need video that educates, builds trust, and drives action — without endless agency cycles. HomeCheff Studio is a story-first AI production line built for ${config.sector.toLowerCase()} teams who must ship repeatable content. ${config.painPoint} ${config.solution} This page maps deliverables, governance, training, and credit planning so ${config.name} can publish this month — not after a six-month tool evaluation.`;

  const sections: SeoContentSection[] = [
    {
      heading: `Video challenges for ${config.name}`,
      paragraphs: [config.painPoint, config.stakeholderPressure],
    },
    {
      heading: "Why storyboards beat random AI clips",
      paragraphs: [config.solution, config.storyboardBenefit],
      bullets: config.deliverables,
    },
    {
      heading: "Production line overview",
      paragraphs: [
        `For ${config.name}, the production line runs Idea → World → Characters → Voices → Scenes → Video → Translation → Publishing — each stage owned before the next begins.`,
        config.productionLineDetail,
      ],
    },
    {
      heading: "Governance and trust",
      paragraphs: [config.complianceNote, config.complianceAssets],
    },
    {
      heading: "Typical deliverables",
      paragraphs: [config.deliverablesExpansion, config.deliverablesReuse],
    },
    {
      heading: "Iteration and measurement",
      paragraphs: [config.iterationMeasurement, config.iterationFinance],
    },
    {
      heading: "Getting started",
      paragraphs: [config.gettingStartedAction, config.gettingStartedBrowse],
    },
    {
      heading: "When to add human videography",
      paragraphs: [config.humanVideography, config.hybridCapture],
    },
    {
      heading: `Training ${config.name} contributors`,
      paragraphs: [config.trainingRotating, config.trainingShotList],
    },
    {
      heading: "Credit budgeting and procurement",
      paragraphs: [config.creditProcurement, config.creditPilot],
    },
    {
      heading: "90-day rollout",
      paragraphs: [config.rolloutMonth, config.rolloutCompliance],
      bullets: config.deliverables,
    },
    {
      heading: "Stack comparison",
      paragraphs: [config.stackComparison, config.stackBrowse],
    },
    {
      heading: `Stakeholder communication for ${config.name}`,
      paragraphs: [config.stakeholderBoard, config.stakeholderResponsive],
    },
    {
      heading: "Accessibility and inclusion",
      paragraphs: [config.accessibilitySubtitles, config.complianceNote],
      bullets: [
        "Subtitles on by default for public-facing cuts",
        "Plain-language review before Publish",
        "Consent tracked for people on camera",
        "Translated Publish versions when communities are multilingual",
      ],
    },
    buildUniqueProductionLineSection(config.productionLine),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Is HomeCheff designed for ${config.name}?`,
      answer: `Yes. This page outlines workflows and deliverables common for ${config.sector.toLowerCase()} teams.`,
    },
    {
      question: "Do we need professional editors?",
      answer: "No timeline editing required. Storyboard-first workflow is enough for most deliverables listed here.",
    },
    {
      question: "Can volunteers use it?",
      answer: "Yes. Projects and Library naming keep assets organized when multiple people contribute.",
    },
    {
      question: "Cost model?",
      answer: "Credits per studio action. See /pricing. Subscriptions can reduce unit cost for frequent publishers.",
    },
    {
      question: "Where to start?",
      answer: `${config.studioCta.label} — ${config.studioCta.href}.`,
    },
  ];

  return {
    slug: config.slug,
    path: `/use-cases/${config.slug}`,
    title,
    metaDescription,
    h1,
    eyebrow: "Use case",
    intro,
    sections,
    faqs,
    internalLinks: [
      { href: "/use-cases", label: "All use cases" },
      { href: "/guides", label: "Guides" },
      { href: "/workflows", label: "Workflows" },
      { href: "/pricing", label: "Pricing" },
    ],
    studioCta: config.studioCta,
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/use-cases", label: "Use cases" },
      { href: `/use-cases/${config.slug}`, label: h1 },
    ],
  };
}

export type IndustryWave3Config = {
  slug: string;
  industry: string;
  buyer: string;
  visualNeed: string;
  storyAngle: string;
  metrics: string;
  scrollHookDetail: string;
  studioEnforcementDetail: string;
  metricsExperimentDetail: string;
  weeklyCadence: string;
  weeklyBatchGuard: string;
  complianceDisclaimerDetail: string;
  formatsChannelsDetail: string;
  formatsSubtitles: string;
  creditsScaleDetail: string;
  creditsSubscription: string;
  nextStepsDetail: string;
  nextStepsBrowse: string;
  channelMixDetail: string;
  seasonalCalendarDetail: string;
  creativeTestingDetail: string;
  procurementAgency: string;
  procurementAlternatives: string;
  operationsNaming: string;
  operationsLegal: string;
  benchmarksWatchthrough: string;
  benchmarksPricing: string;
  benchmarksPair: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
};

export function buildIndustryWave3Page(config: IndustryWave3Config): SeoContentPage {
  const title = `AI Video for ${config.industry}`;
  const h1 = `${config.industry} video production with HomeCheff`;
  const metaDescription = `Create ${config.industry.toLowerCase()} marketing and product video with HomeCheff Studio — storyboards, AI motion, voice, and publishing.`;

  const intro = `${config.industry} brands win attention when they show — not only tell — value. HomeCheff Studio helps ${config.buyer} produce storyboarded video with consistent visuals, voice, subtitles, and channel-specific exports. ${config.visualNeed} ${config.storyAngle} This industry hub covers structure, metrics, compliance, channel mix, and how to template campaigns so credit cost falls after your third episode.`;

  const sections: SeoContentSection[] = [
    {
      heading: `${config.industry} video trends`,
      paragraphs: [config.visualNeed, config.scrollHookDetail],
    },
    {
      heading: "Story structure that converts",
      paragraphs: [config.storyAngle, config.studioEnforcementDetail],
      bullets: [
        "Hook scene — pattern interrupt",
        "Problem or desire scene",
        "Product or service demonstration",
        "Proof — reviews, stats, credentials",
        "CTA — offer, link, booking",
      ],
    },
    {
      heading: `Metrics ${config.buyer} track`,
      paragraphs: [config.metrics, config.metricsExperimentDetail],
    },
    {
      heading: "Production workflow",
      paragraphs: [config.weeklyCadence, config.weeklyBatchGuard],
    },
    {
      heading: "Compliance and brand safety",
      paragraphs: [
        `Regulated or reputation-sensitive ${config.industry.toLowerCase()} categories must review on-screen claims and subtitles. HomeCheff does not replace legal review — it makes revisions cheaper by scene.`,
        config.complianceDisclaimerDetail,
      ],
    },
    {
      heading: "Formats and channels",
      paragraphs: [config.formatsChannelsDetail, config.formatsSubtitles],
    },
    {
      heading: "Credits and scale",
      paragraphs: [config.creditsScaleDetail, config.creditsSubscription],
    },
    {
      heading: "Next steps",
      paragraphs: [config.nextStepsDetail, config.nextStepsBrowse],
    },
    {
      heading: `Channel mix for ${config.industry}`,
      paragraphs: [
        `${config.buyer} typically split exports across paid social, owned email, product detail pages, and sales decks. HomeCheff Publish versions let you name experiments per channel while sharing one storyboard.`,
        config.channelMixDetail,
      ],
    },
    {
      heading: "Seasonal and campaign calendar",
      paragraphs: [
        `${config.industry} marketing rarely sleeps on one hero video. Template quarterly campaigns in Projects — spring launch, summer promo, back-to-school, holiday — reusing Library characters and brand worlds.`,
        config.seasonalCalendarDetail,
      ],
    },
    {
      heading: "Creative testing discipline",
      paragraphs: [config.metrics, config.creativeTestingDetail],
    },
    {
      heading: "Procurement and alternatives",
      paragraphs: [config.procurementAgency, config.procurementAlternatives],
    },
    {
      heading: `Proof and trust in ${config.industry}`,
      paragraphs: [
        config.storyAngle,
        `Third-party proof scenes — reviews, certifications, case metrics — belong in the middle of the storyboard, not buried in scene five. ${config.buyer} should template where proof appears so tests isolate hook quality.`,
      ],
    },
    {
      heading: "Operations and handoff",
      paragraphs: [config.operationsNaming, config.operationsLegal],
    },
    buildUniqueProductionLineSection(config.productionLine),
    {
      heading: `Benchmarks ${config.buyer} should watch`,
      paragraphs: [
        config.metrics,
        config.benchmarksWatchthrough,
        config.benchmarksPricing,
        config.benchmarksPair,
      ],
    },
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Does HomeCheff work for ${config.industry}?`,
      answer: `Yes. This hub page covers typical ${config.industry.toLowerCase()} story angles, metrics, compliance notes, and workflows for ${config.buyer}.`,
    },
    {
      question: "Product accuracy?",
      answer: "Upload reference photos and UI captures. Approve scene stills before motion to keep packaging, features, and on-screen claims accurate.",
    },
    {
      question: "Multiple SKUs?",
      answer: "Duplicate storyboards per product line. Share Library brand assets across Projects to amortize setup credits.",
    },
    {
      question: "Pricing?",
      answer: "Credit-based studio actions. See /pricing for live numbers before batch motion renders.",
    },
    {
      question: "First project?",
      answer: `Sign up at /signup, then ${config.studioCta.label} at ${config.studioCta.href} with a five-scene pilot.`,
    },
  ];

  return {
    slug: config.slug,
    path: `/industries/${config.slug}`,
    title,
    metaDescription,
    h1,
    eyebrow: "Industry",
    intro,
    sections,
    faqs,
    internalLinks: [
      { href: "/industries", label: "All industries" },
      { href: "/guides/how-to-create-marketing-videos", label: "Marketing videos guide" },
      { href: "/workflows/marketing", label: "Marketing workflow" },
      { href: "/alternatives/canva", label: "Canva alternative" },
      { href: "/pricing", label: "Pricing" },
    ],
    studioCta: config.studioCta,
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/industries", label: "Industries" },
      { href: `/industries/${config.slug}`, label: h1 },
    ],
  };
}

export type LongtailGuideWave3Config = {
  slug: string;
  title: string;
  h1: string;
  keyword: string;
  theme: string;
  searchIntent: string;
  audience: string;
  workflowTip: string;
  keywordContext: string;
  preflightGoal: string;
  editorUpload: string;
  editorReferences: string;
  studioScenes: string;
  motionBatch: string;
  voicePublish: string;
  publishIterate: string;
  mistakesFix: string;
  scaleInternal: string;
  budgetCluster: string;
  qualityBrand: string;
  relatedWorkflows: string;
  keywordExpansion: string;
  workflowClosing: string;
  productionLine: ProductionLineContext;
  studioCta: SeoContentLink;
};

export function buildLongtailGuideWave3Page(config: LongtailGuideWave3Config): SeoContentPage {
  const metaDescription = `${config.keyword} — complete guide using HomeCheff Studio for storyboards, AI motion, voice, subtitles, and publishing.`;

  const intro = `People searching for ${config.keyword} usually want ${config.searchIntent}. HomeCheff Studio answers that with a story-first production line — not a single prompt and hope. This guide shows ${config.audience} how to plan scenes, prepare assets in Editor, animate in Motion, and publish channel-ready versions. Theme focus: ${config.theme}. We cover checklist, mistakes, credit budgeting, and how to turn one winning video into a series without duplicate content or generic stock montages.`;

  const sections: SeoContentSection[] = [
    {
      heading: "What this keyword really means",
      paragraphs: [config.keywordContext, config.searchIntent],
    },
    {
      heading: "Pre-flight checklist",
      paragraphs: [config.preflightGoal, config.workflowTip],
      bullets: [
        "Single measurable goal",
        "3–9 scenes for first project",
        "References uploaded to Editor",
        "Voice tone chosen",
        "Subtitles planned",
        "Credit budget checked on /pricing",
        "Publish channels listed",
        "Project named in Studio",
      ],
    },
    {
      heading: "Step 1 — Editor and Library",
      paragraphs: [config.editorUpload, config.editorReferences],
    },
    {
      heading: "Step 2 — Studio storyboard",
      paragraphs: [config.studioScenes, config.workflowTip],
    },
    {
      heading: "Step 3 — Motion",
      paragraphs: [config.motionBatch],
    },
    {
      heading: "Step 4 — Voice, subtitles, translation",
      paragraphs: [config.voicePublish],
    },
    {
      heading: "Step 5 — Publish and iterate",
      paragraphs: [config.publishIterate],
    },
    {
      heading: "Common mistakes",
      paragraphs: [config.mistakesFix],
    },
    {
      heading: "Scaling content in this cluster",
      paragraphs: [config.scaleInternal],
    },
    {
      heading: "Credit budgeting for this keyword cluster",
      paragraphs: [config.budgetCluster],
    },
    {
      heading: "Quality bar and brand safety",
      paragraphs: [config.qualityBrand],
    },
    {
      heading: "Related workflows",
      paragraphs: [config.relatedWorkflows],
    },
    {
      heading: "Series production",
      paragraphs: [
        `Turn one successful ${config.keyword} video into a series: same structure, new hook or offer weekly. Library intros and characters amortize setup time for ${config.theme} content.`,
        `Track Publish version names on ${config.slug} deliverables so you know which episode drove signups, sales, or watch-through for ${config.audience}.`,
      ],
    },
    {
      heading: `Production discipline for ${config.keyword}`,
      paragraphs: [config.keywordExpansion, config.workflowClosing],
    },
    buildUniqueProductionLineSection(config.productionLine),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `How do I start with ${config.keyword}?`,
      answer: `Sign up at /signup, check /pricing, then ${config.studioCta.label} at ${config.studioCta.href}. Plan five scenes before batch motion.`,
    },
    {
      question: "Do I need editing experience?",
      answer: "No. Storyboard-first workflow avoids timeline editing for most deliverables in this keyword cluster.",
    },
    {
      question: "How long does the first video take?",
      answer: `Many ${config.audience} ship a five-scene video in one to three hours including revisions once references are ready.`,
    },
    {
      question: "Cost?",
      answer: "Credits per studio action. See /pricing for current tables. Approve stills before motion to control spend.",
    },
    {
      question: "Is content unique?",
      answer: `You direct scenes and upload references for ${config.keyword}. Outputs reflect your brief — not generic stock montages.`,
    },
  ];

  return {
    slug: config.slug,
    path: `/guides/${config.slug}`,
    title: config.title,
    metaDescription,
    h1: config.h1,
    eyebrow: "Longtail guide",
    intro,
    sections,
    faqs,
    internalLinks: [
      { href: "/guides", label: "All guides" },
      { href: "/industries", label: "Industries" },
      { href: "/use-cases", label: "Use cases" },
      { href: "/pricing", label: "Pricing" },
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
