import type { SeoContentPage } from "@/lib/seo/seo-content-types";

const TRADEMARK_DISCLAIMER =
  "HomeCheff Studio is not affiliated with the compared product. All trademarks belong to their respective owners. This page is an independent comparison for creators evaluating workflow fit.";

function altBase(
  slug: string,
  competitor: string,
  title: string,
  metaDescription: string,
  h1: string,
  intro: string,
  sections: SeoContentPage["sections"],
  rows: SeoContentPage["comparisonTable"] extends infer T ? T extends { rows: infer R } ? R : never : never,
  faqs: SeoContentPage["faqs"],
  internalLinks: SeoContentPage["internalLinks"],
  studioCta: SeoContentPage["studioCta"]
): SeoContentPage {
  return {
    slug,
    path: `/alternatives/${slug}`,
    title,
    metaDescription,
    h1,
    eyebrow: "Comparison",
    intro,
    sections,
    comparisonTable: { otherLabel: competitor, rows },
    faqs,
    internalLinks,
    studioCta,
    disclaimers: [TRADEMARK_DISCLAIMER],
    locale: "en",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/alternatives", label: "Alternatives" },
      { href: `/alternatives/${slug}`, label: title },
    ],
  };
}

export const ALTERNATIVE_SLUGS = [
  "photoshop",
  "canva",
  "capcut",
  "premiere-pro",
  "after-effects",
  "runway",
  "pika",
  "invideo",
  "descript",
  "elevenlabs",
] as const;

export type AlternativeSlug = (typeof ALTERNATIVE_SLUGS)[number];

export const ALTERNATIVES_CONTENT: Record<AlternativeSlug, SeoContentPage> = {
  photoshop: altBase(
    "photoshop",
    "Adobe Photoshop",
    "Photoshop Alternative for AI Video Production",
    "Compare HomeCheff Studio vs Photoshop for creators who need image assets, storyboards, and video — not layer-based retouching alone.",
    "HomeCheff Studio as a Photoshop alternative for video creators",
    "Photoshop remains the industry standard for pixel-level image editing. HomeCheff Studio is a different kind of tool: an AI production line that turns images into storyboards, voiced scenes, and published video — in the browser, with transparent credits.",
    [
      {
        heading: "When Photoshop is still the right choice",
        paragraphs: [
          "If you need professional retouching, CMYK print prep, deep layer compositing, or a vast plugin ecosystem, Photoshop is still unmatched. HomeCheff does not replace a print designer's daily driver.",
        ],
      },
      {
        heading: "When HomeCheff Studio fits better",
        paragraphs: [
          "Creators who start with sketches, product photos, or AI-generated assets and need to reach video fast benefit from HomeCheff's connected pipeline. Editor handles fusion and references; Studio plans scenes; Motion animates; Publish ships versions.",
        ],
        bullets: [
          "Browser-based — no Creative Cloud subscription required for video output",
          "AI-native image workflows with handoff to storyboards",
          "Character and world consistency across scenes",
          "Voice, subtitles, translation, and publishing in one project",
        ],
      },
    ],
    [
      { feature: "Primary output", homecheff: "Video + storyboards", other: "Static images" },
      { feature: "Workflow", homecheff: "Idea → publish pipeline", other: "Layer editing" },
      { feature: "Video", homecheff: "Native Motion module", other: "Not a video suite" },
      { feature: "Pricing", homecheff: "Credits + subscriptions", other: "Adobe subscription" },
      { feature: "Learning curve", homecheff: "Guided wizards", other: "Professional depth" },
    ],
    [
      {
        question: "Can HomeCheff replace Photoshop entirely?",
        answer:
          "For video-first creators, often yes for the production path. For print, advanced retouching, or PSD workflows, keep Photoshop and use HomeCheff downstream.",
      },
      {
        question: "Can I upload images from Photoshop into HomeCheff?",
        answer:
          "Yes. Export PNG or JPG from Photoshop and upload in Editor or Studio. Assets live in your Library for reuse across scenes.",
      },
      {
        question: "Does HomeCheff support layers like Photoshop?",
        answer:
          "HomeCheff Editor focuses on AI fusion, references, and segmentation — not manual layer stacks. The goal is faster asset creation for video, not bitmap editing parity.",
      },
      {
        question: "Is HomeCheff better for social video than Photoshop?",
        answer:
          "Yes. Photoshop can export short clips, but HomeCheff is built for storyboards, motion, voice, and multi-version publishing.",
      },
      {
        question: "How much does HomeCheff cost compared to Photoshop?",
        answer:
          "HomeCheff uses Studio Credits with public pricing on /pricing. You pay per action rather than a fixed Adobe Photography or Creative Cloud plan.",
      },
    ],
    [
      { href: "/editor", label: "AI Image Editor" },
      { href: "/guides/van-schets-naar-animatie", label: "Van schets naar animatie" },
      { href: "/alternatives/canva", label: "Canva alternative" },
      { href: "/workflows/artist", label: "Artist workflows" },
    ],
    { href: "/editor/start", label: "Start in Editor" }
  ),

  canva: altBase(
    "canva",
    "Canva",
    "Canva Alternative for AI Video & Storyboards",
    "HomeCheff Studio vs Canva: story-first video production with reusable characters, voice, subtitles, and publishing — beyond template slides.",
    "HomeCheff Studio as a Canva alternative for video",
    "Canva excels at quick designs and template-based social graphics. HomeCheff Studio targets creators who need consistent characters, multi-scene storyboards, AI motion, and localized versions — a production line, not a slide deck.",
    [
      {
        heading: "What Canva does well",
        paragraphs: [
          "Templates, brand kits, and fast static content for marketing teams. For a Tuesday Instagram post, Canva is hard to beat on speed.",
        ],
      },
      {
        heading: "Where HomeCheff Studio goes further",
        paragraphs: [
          "When your content is story-driven — episodic characters, campaign narratives, or book trailers — you need scene planning before generation. Studio storyboards keep characters on-model; Motion turns scene images into clips; Publish manages versions.",
        ],
        bullets: [
          "Storyboard-first planning vs template slots",
          "Reusable character identity across episodes",
          "AI voice, subtitles, and translation built in",
          "Transparent credit pricing per studio action",
        ],
      },
    ],
    [
      { feature: "Video model", homecheff: "Scene-based production", other: "Template timeline" },
      { feature: "Character consistency", homecheff: "Identity profiles + Library", other: "Limited across videos" },
      { feature: "Voice & translation", homecheff: "Integrated", other: "Add-on / basic" },
      { feature: "Best for", homecheff: "Series & campaigns", other: "Quick social graphics" },
    ],
    [
      {
        question: "Is HomeCheff harder to learn than Canva?",
        answer:
          "There is more creative structure because you plan scenes first. Wizards and guides shorten the ramp. Canva is faster for one-off templates; HomeCheff wins on repeatable production.",
      },
      {
        question: "Can I still use Canva with HomeCheff?",
        answer:
          "Many teams design static assets in Canva and produce motion, voice, and versions in HomeCheff. They complement each other.",
      },
      {
        question: "Does HomeCheff have templates?",
        answer:
          "HomeCheff focuses on your assets and storyboards rather than a template marketplace. You build reusable worlds and characters instead of filling slots.",
      },
      {
        question: "Which is cheaper for video?",
        answer:
          "Depends on volume. HomeCheff publishes per-action credit costs. Compare your typical render count on /pricing.",
      },
      {
        question: "Can HomeCheff export for social media?",
        answer: "Yes. Publish exports versions suited for social, campaigns, and multi-language channels.",
      },
    ],
    [
      { href: "/studio", label: "Studio" },
      { href: "/guides/maak-je-eigen-cartoon", label: "Maak je eigen cartoon" },
      { href: "/alternatives/capcut", label: "CapCut alternative" },
      { href: "/workflows/marketing", label: "Marketing workflows" },
    ],
    { href: "/studio/storyboards/new", label: "Create a storyboard" }
  ),

  capcut: altBase(
    "capcut",
    "CapCut",
    "CapCut Alternative for Web Video Production",
    "HomeCheff Studio vs CapCut: generate and plan AI video from storyboards — not only trim existing footage on mobile.",
    "HomeCheff Studio as a CapCut alternative",
    "CapCut is a popular mobile and desktop editor for trimming, effects, and trends. HomeCheff Studio is for creators who want to generate scenes, keep characters consistent, and publish campaign versions from a browser-based production line.",
    [
      {
        heading: "When CapCut is enough",
        paragraphs: [
          "You already have footage, need fast cuts, trending effects, or TikTok-native editing. CapCut's mobile UX is optimized for that job.",
        ],
      },
      {
        heading: "When to choose HomeCheff Studio",
        paragraphs: [
          "You start from images, storyboards, or scripts and need AI-generated motion, voice, and subtitles. Projects and Library track assets across episodes — something clip editors do not center.",
        ],
        bullets: [
          "Image-to-video and storyboard handoff",
          "Project dashboard across Editor, Studio, Motion",
          "Credit-transparent pricing for renders",
          "Multi-language version export",
        ],
      },
    ],
    [
      { feature: "Starting point", homecheff: "Images & storyboards", other: "Existing clips" },
      { feature: "Platform", homecheff: "Web production suite", other: "Mobile-first editor" },
      { feature: "AI generation", homecheff: "Scene pipeline", other: "Effects & auto-cut" },
      { feature: "Series workflow", homecheff: "Library + Projects", other: "Per-project timeline" },
    ],
    [
      {
        question: "Can HomeCheff edit my CapCut exports?",
        answer:
          "HomeCheff is generation- and story-first. Import generated clips into either tool depending on your finish workflow; many users generate in HomeCheff and do final trims elsewhere.",
      },
      {
        question: "Is HomeCheff better for YouTube than CapCut?",
        answer:
          "For animated or AI-generated explainer content with consistent characters, yes. For vlog-style editing of recorded footage, CapCut may be faster.",
      },
      {
        question: "Does HomeCheff work on phone?",
        answer: "HomeCheff is a web studio optimized for desktop production. CapCut leads on phone-only editing.",
      },
      {
        question: "Can I make TikToks in HomeCheff?",
        answer: "Yes. Create short scene-based clips in Motion and export via Publish for vertical formats.",
      },
      {
        question: "How do credits compare to CapCut Pro?",
        answer: "HomeCheff charges per studio action. See /pricing for render and generation costs.",
      },
    ],
    [
      { href: "/animate/instant", label: "Motion" },
      { href: "/guides/breng-je-tekeningen-tot-leven", label: "Breng tekeningen tot leven" },
      { href: "/alternatives/canva", label: "Canva alternative" },
    ],
    { href: "/animate/instant", label: "Create AI video" }
  ),

  "premiere-pro": altBase(
    "premiere-pro",
    "Adobe Premiere Pro",
    "Premiere Pro Alternative for AI-Assisted Video",
    "HomeCheff Studio vs Premiere Pro: storyboard-first AI assembly with subtitles and translation — without a traditional NLE timeline.",
    "HomeCheff Studio as a Premiere Pro alternative",
    "Premiere Pro is a professional non-linear editor for broadcast and film workflows. HomeCheff Studio serves creators who want AI-assisted scene generation, automatic subtitles, translation, and publishing without mastering a timeline-first NLE.",
    [
      {
        heading: "When Premiere Pro wins",
        paragraphs: [
          "Long-form edits, multicam, advanced color, broadcast delivery, and deep integration with After Effects and Audition. Professional editors will keep Premiere for those jobs.",
        ],
      },
      {
        heading: "When HomeCheff Studio wins",
        paragraphs: [
          "Short-form campaigns, explainers, storyboard-driven ads, and multilingual versions. You plan scenes in Studio, generate motion, assign voices, and publish — without assembling every cut manually.",
        ],
        bullets: [
          "No timeline learning curve for campaign output",
          "AI scene images and image-to-video",
          "Built-in subtitle and translation paths",
          "Version lineage for A/B and locale variants",
        ],
      },
    ],
    [
      { feature: "Core paradigm", homecheff: "Storyboard → generate", other: "Timeline editing" },
      { feature: "AI scenes", homecheff: "Native", other: "Plugins / manual" },
      { feature: "Localization", homecheff: "Version export", other: "Manual duplication" },
      { feature: "Subscription", homecheff: "Credits model", other: "Creative Cloud" },
    ],
    [
      {
        question: "Can professionals use HomeCheff?",
        answer:
          "Yes, for pre-visualization, client storyboards, and rapid campaign variants. Many pros use both tools.",
      },
      {
        question: "Does HomeCheff export Premiere-compatible files?",
        answer: "Publish exports standard video formats you can import into Premiere for final polish if needed.",
      },
      {
        question: "Is HomeCheff a non-linear editor?",
        answer: "No. It is a production line for generated and planned content, not a replacement NLE.",
      },
      {
        question: "Can I add subtitles in HomeCheff?",
        answer: "Yes. Subtitle generation and styling are part of the Studio and export workflow.",
      },
      {
        question: "Who should switch from Premiere to HomeCheff?",
        answer:
          "Solo creators and marketers who spend more time generating scenes than cutting footage — not broadcast editors.",
      },
    ],
    [
      { href: "/publish", label: "Publish" },
      { href: "/guides/van-verhaal-naar-video", label: "Van verhaal naar video" },
      { href: "/alternatives/after-effects", label: "After Effects alternative" },
    ],
    { href: "/studio/storyboards/new", label: "Plan your scenes" }
  ),

  "after-effects": altBase(
    "after-effects",
    "Adobe After Effects",
    "After Effects Alternative for Motion Without Keyframes",
    "HomeCheff Studio vs After Effects: image-to-video and storyboard scenes instead of keyframe compositing and expressions.",
    "HomeCheff Studio as an After Effects alternative",
    "After Effects is the standard for motion graphics, compositing, and VFX. HomeCheff Studio offers a different path: storyboard scenes, image-to-video generation, and text overlays — aimed at creators who do not want to keyframe every move.",
    [
      {
        heading: "After Effects strengths",
        paragraphs: [
          "Expressions, plugins, cinema compositing, title sequences, and precise motion design. Motion designers will continue to rely on AE for high-end craft.",
        ],
      },
      {
        heading: "HomeCheff approach to motion",
        paragraphs: [
          "You compose scenes in Studio, animate stills and scene images in Motion, and layer story text with export tools. Reusable characters reduce rebuilding rigs for every project.",
        ],
        bullets: [
          "Image-to-video for scene motion",
          "Storyboard-driven composition",
          "Character reuse via Library",
          "Faster path for social and campaign clips",
        ],
      },
    ],
    [
      { feature: "Motion method", homecheff: "AI scene animation", other: "Keyframes & compositing" },
      { feature: "Skill floor", homecheff: "Guided wizards", other: "Steep" },
      { feature: "VFX depth", homecheff: "Campaign-focused", other: "Professional VFX" },
      { feature: "Output", homecheff: "Publish versions", other: "Render queue" },
    ],
    [
      {
        question: "Can HomeCheff do motion graphics?",
        answer:
          "It handles scene motion, text overlays, and story-driven clips. Complex motion design and VFX still belong in After Effects.",
      },
      {
        question: "Do I need animation experience?",
        answer: "No. Guides and wizards walk you from sketch or storyboard to motion.",
      },
      {
        question: "Can AE artists use HomeCheff?",
        answer: "Yes — for fast previz, storyboard animatics, and variant generation before AE finishing.",
      },
      {
        question: "Does HomeCheff support plugins?",
        answer: "No plugin ecosystem. It is an integrated studio with built-in AI providers.",
      },
      {
        question: "What file types can I export?",
        answer: "Standard video formats via Publish. See help for format details.",
      },
    ],
    [
      { href: "/animate/instant", label: "Motion" },
      { href: "/guides/van-schets-naar-animatie", label: "Van schets naar animatie" },
      { href: "/workflows/artist", label: "Artist workflows" },
    ],
    { href: "/animate/instant", label: "Animate a scene" }
  ),

  runway: altBase(
    "runway",
    "Runway",
    "Runway Alternative with Full Production Workflow",
    "HomeCheff Studio vs Runway: multi-scene storyboards, voice, subtitles, Library, and publishing — not single-clip generation alone.",
    "HomeCheff Studio as a Runway alternative",
    "Runway is known for cutting-edge generative video models. HomeCheff Studio wraps generation in a creator workflow: storyboards, character consistency, voice, subtitles, translation, and project management with transparent credits.",
    [
      {
        heading: "When Runway is the right tool",
        paragraphs: [
          "Experimenting with the latest models, one-off cinematic clips, or API-driven pipelines where you bring your own application shell.",
        ],
      },
      {
        heading: "When HomeCheff Studio adds more value",
        paragraphs: [
          "Campaigns and series need planning before generation. Studio links scenes; Library keeps characters consistent; Motion renders; Publish ships locales and versions.",
        ],
        bullets: [
          "Storyboard → Motion handoff",
          "Character identity across scenes",
          "Voice and subtitle stack",
          "Public credit catalog on /pricing",
        ],
      },
    ],
    [
      { feature: "Scope", homecheff: "Full production suite", other: "Generation platform" },
      { feature: "Story planning", homecheff: "Studio storyboards", other: "Clip-centric" },
      { feature: "Voice & subs", homecheff: "Integrated", other: "Limited" },
      { feature: "Billing clarity", homecheff: "Per-action credits", other: "Plan + credits" },
    ],
    [
      {
        question: "Does HomeCheff use the same AI models as Runway?",
        answer:
          "HomeCheff integrates provider pipelines including image-to-video for Motion. The difference is the production workflow around generation.",
      },
      {
        question: "Can I migrate Runway clips into HomeCheff?",
        answer: "Import assets into Library and reference them in storyboards for continuity and voice-over.",
      },
      {
        question: "Is HomeCheff better for agencies?",
        answer: "Yes, when deliverables include storyboards, variants, and localized versions — not just hero clips.",
      },
      {
        question: "Which is easier for beginners?",
        answer: "HomeCheff guides story-first creation. Runway is powerful but clip-experiment oriented.",
      },
      {
        question: "Where are prices listed?",
        answer: "On /pricing with per-action Studio Credits.",
      },
    ],
    [
      { href: "/studio", label: "Studio" },
      { href: "/guides/maak-je-eigen-anime", label: "Maak je eigen anime" },
      { href: "/alternatives/pika", label: "Pika alternative" },
    ],
    { href: "/studio/storyboards/new", label: "Start a storyboard" }
  ),

  pika: altBase(
    "pika",
    "Pika",
    "Pika Alternative for Series & Story Production",
    "HomeCheff Studio vs Pika: from single AI clips to full storyboards, Library, and publishing.",
    "HomeCheff Studio as a Pika alternative",
    "Pika popularized quick AI clip generation from prompts and images. HomeCheff Studio is built when those clips must belong to a story — same characters, multiple scenes, voice, and published versions.",
    [
      {
        heading: "Pika's sweet spot",
        paragraphs: ["Fast, fun clip experiments and short animations from a single image or prompt."],
      },
      {
        heading: "HomeCheff Studio's sweet spot",
        paragraphs: [
          "Episodic content, brand mascots, book trailers, and campaigns where clip #7 must match clip #1. Storyboards and Library enforce continuity.",
        ],
        bullets: [
          "Editor → Studio → Motion chain",
          "Projects for episodic work",
          "Voice and translation",
          "Publish multiple versions",
        ],
      },
    ],
    [
      { feature: "Unit of work", homecheff: "Project / series", other: "Clip" },
      { feature: "Continuity", homecheff: "Character profiles", other: "Per-clip" },
      { feature: "Voice", homecheff: "Built-in", other: "External" },
      { feature: "Publishing", homecheff: "Version center", other: "Download clip" },
    ],
    [
      {
        question: "Is HomeCheff slower than Pika?",
        answer: "More setup upfront for storyboards, but faster across ten scenes that must match.",
      },
      {
        question: "Can I make one-off clips?",
        answer: "Yes. Use Motion directly for a single image-to-video clip without a full series.",
      },
      {
        question: "Do I need a storyboard?",
        answer: "Recommended for consistency. Optional for quick single clips.",
      },
      {
        question: "Is HomeCheff for hobbyists?",
        answer: "Yes — guides cover cartoons, drawings, and anime projects.",
      },
      {
        question: "How do I try it?",
        answer: "Create a free account and open Studio or Motion from the homepage.",
      },
    ],
    [
      { href: "/animate/instant", label: "Motion" },
      { href: "/guides/maak-je-eigen-animatieserie", label: "Maak je eigen animatieserie" },
      { href: "/workflows/creator-dreams", label: "Creator Dreams" },
    ],
    { href: "/animate/instant", label: "Open Motion" }
  ),

  invideo: altBase(
    "invideo",
    "InVideo",
    "InVideo Alternative for Story-Driven Video",
    "HomeCheff Studio vs InVideo: custom storyboards and characters instead of template-only video assembly.",
    "HomeCheff Studio as an InVideo alternative",
    "InVideo helps marketers fill templates with stock and text quickly. HomeCheff Studio suits teams who bring their own characters, worlds, and scene plans — and need AI generation, voice, and localization in one line.",
    [
      {
        heading: "InVideo advantages",
        paragraphs: ["Large template library, fast marketing videos, and AI assist for script-to-video in a template frame."],
      },
      {
        heading: "HomeCheff advantages",
        paragraphs: [
          "Your brand assets and story architecture lead. Studio builds scene plans; characters stay consistent; you are not limited to stock slot layouts.",
        ],
        bullets: [
          "Custom storyboards vs template slots",
          "Editor-generated assets",
          "Deeper voice and translation",
          "Library for brand continuity",
        ],
      },
    ],
    [
      { feature: "Content model", homecheff: "Your story & assets", other: "Templates & stock" },
      { feature: "Characters", homecheff: "Identity system", other: "Stock avatars" },
      { feature: "Series", homecheff: "Projects + Library", other: "Per video" },
      { feature: "Localization", homecheff: "Version workflow", other: "Varies by plan" },
    ],
    [
      {
        question: "Is HomeCheff harder than InVideo?",
        answer: "More creative control means more steps. Better for unique brand stories than generic templates.",
      },
      {
        question: "Can marketers use HomeCheff?",
        answer: "Yes. See /workflows/marketing and /guides/eigen-contentteam-met-ai.",
      },
      {
        question: "Does HomeCheff have stock footage?",
        answer: "Focus is on generated and owned assets in Library, not stock marketplaces.",
      },
      {
        question: "Can I repurpose InVideo scripts?",
        answer: "Import copy into a Studio production brief and storyboard scenes from it.",
      },
      {
        question: "Free trial?",
        answer: "Sign up at /signup and review credit costs on /pricing.",
      },
    ],
    [
      { href: "/guides/eigen-contentteam-met-ai", label: "AI content team" },
      { href: "/guides/van-boek-naar-film", label: "Van boek naar film" },
      { href: "/workflows/marketing", label: "Marketing workflows" },
    ],
    { href: "/studio/storyboards/new", label: "Build your storyboard" }
  ),

  descript: altBase(
    "descript",
    "Descript",
    "Descript Alternative for Generated Video Production",
    "HomeCheff Studio vs Descript: story-first AI video with scenes and motion — not transcript-first editing of recorded footage.",
    "HomeCheff Studio as a Descript alternative",
    "Descript revolutionized podcast and interview editing via transcripts. HomeCheff Studio targets creators who generate scenes, characters, and motion — then add voice, subtitles, and translations in a visual production pipeline.",
    [
      {
        heading: "When Descript fits",
        paragraphs: [
          "Recorded podcasts, interviews, screen capture, and overdub editing where the transcript is the source of truth.",
        ],
      },
      {
        heading: "When HomeCheff fits",
        paragraphs: [
          "You are creating visual stories from scripts, storyboards, or images — not cleaning up a Zoom recording. Voice is assigned to characters; scenes are generated; versions publish to channels.",
        ],
        bullets: [
          "Visual storyboard workflow",
          "AI scene and motion generation",
          "Character voices",
          "Multilingual version export",
        ],
      },
    ],
    [
      { feature: "Source material", homecheff: "Scripts & images", other: "Recordings" },
      { feature: "Editing paradigm", homecheff: "Scene planning", other: "Transcript editing" },
      { feature: "Visual generation", homecheff: "Core", other: "Secondary" },
      { feature: "Overdub", homecheff: "Character voice", other: "Transcript overdub" },
    ],
    [
      {
        question: "Can HomeCheff edit podcasts?",
        answer: "It is not a podcast editor. Use Descript for audio-first; HomeCheff for visual storytelling.",
      },
      {
        question: "Does HomeCheff generate subtitles?",
        answer: "Yes, for visual productions with on-screen text and export.",
      },
      {
        question: "Can I import Descript transcripts?",
        answer: "Use transcript text as source for scene beats in a Studio storyboard.",
      },
      {
        question: "Which tool for explainers?",
        answer: "HomeCheff when visuals are generated; Descript when narrating existing screen recordings.",
      },
      {
        question: "Team workflows?",
        answer: "HomeCheff Projects and Library support shared production across modules.",
      },
    ],
    [
      { href: "/studio", label: "Studio" },
      { href: "/guides/van-verhaal-naar-video", label: "Van verhaal naar video" },
      { href: "/alternatives/elevenlabs", label: "ElevenLabs alternative" },
    ],
    { href: "/studio/storyboards/new", label: "Open Studio" }
  ),

  elevenlabs: altBase(
    "elevenlabs",
    "ElevenLabs",
    "ElevenLabs Alternative with Video & Voice Together",
    "HomeCheff Studio vs ElevenLabs: character voices inside storyboards, motion, subtitles, and publishing — not voice-only APIs.",
    "HomeCheff Studio as an ElevenLabs alternative",
    "ElevenLabs leads standalone AI voice and dubbing. HomeCheff Studio integrates voice assignment, character identity, scene video, subtitles, and publishing — for creators who need more than an audio file.",
    [
      {
        heading: "ElevenLabs strengths",
        paragraphs: [
          "Voice cloning depth, API access, dubbing tools, and a large voice marketplace for developers and audio producers.",
        ],
      },
      {
        heading: "HomeCheff strengths",
        paragraphs: [
          "Voice is one layer in the production line. Assign voices to characters, generate scene video, add subtitles, translate, and publish — without stitching tools manually.",
        ],
        bullets: [
          "Character → voice mapping in Studio",
          "Scene video + voice in one project",
          "Subtitle and translation export",
          "Credit-transparent voice actions",
        ],
      },
    ],
    [
      { feature: "Product type", homecheff: "Video production suite", other: "Voice platform" },
      { feature: "Video", homecheff: "Native", other: "Not included" },
      { feature: "Character system", homecheff: "Yes", other: "Voice profiles only" },
      { feature: "API-first", homecheff: "Creator UI", other: "Strong API" },
    ],
    [
      {
        question: "Does HomeCheff clone voices?",
        answer: "Studio supports voice library and character voice workflows. See in-app voice features for current capabilities.",
      },
      {
        question: "Can I use ElevenLabs with HomeCheff?",
        answer: "HomeCheff uses integrated voice providers for production. Compare end-to-end workflow vs stitching tools.",
      },
      {
        question: "Is HomeCheff better for YouTube narrators?",
        answer: "If you need visual scenes plus voice, yes. Voice-only channels may stay on ElevenLabs.",
      },
      {
        question: "Multilingual dubbing?",
        answer: "HomeCheff supports translation and multi-language version export in the production pipeline.",
      },
      {
        question: "Pricing comparison?",
        answer: "HomeCheff lists voice action credits on /pricing alongside video and image actions.",
      },
    ],
    [
      { href: "/studio/characters", label: "Characters" },
      { href: "/guides/maak-je-eigen-cartoon", label: "Maak je eigen cartoon" },
      { href: "/workflows/filmmaker", label: "Filmmaker workflows" },
    ],
    { href: "/studio/characters/new", label: "Create a character voice" }
  ),
};

export function getAlternative(slug: string): SeoContentPage | null {
  if (!(slug in ALTERNATIVES_CONTENT)) return null;
  return ALTERNATIVES_CONTENT[slug as AlternativeSlug];
}

export const ALTERNATIVE_PATHS = ALTERNATIVE_SLUGS.map((s) => `/alternatives/${s}` as const);
