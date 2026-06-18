#!/usr/bin/env node
/**
 * Generates Wave 1 SEO config files with substantive, unique content.
 * Run: node scripts/generate-seo-wave1.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function esc(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

function sentenceCount(text) {
  return String(text)
    .split(/[.!?]+/g)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function ensureParagraphRules(label, text) {
  const count = sentenceCount(text);
  if (count < 2 || count > 4) {
    throw new Error(`${label} must contain 2-4 sentences, got ${count}`);
  }
}

function words(text) {
  return String(text)
    .split(/\s+/g)
    .map((w) => w.trim())
    .filter(Boolean).length;
}

function three(a, b, c) {
  return `${a} ${b} ${c}`;
}

function four(a, b, c, d) {
  return `${a} ${b} ${c} ${d}`;
}

const ALT_ENTRIES = [
  {
    slug: "photoshop",
    competitor: "Adobe Photoshop",
    category: "image compositing and retouching",
    competitorAudience: "designers and retouchers",
    homecheffAudience: "video creators and campaign teams",
    competitorEdge: "pixel level control, masks, and mature plugin workflows",
    homecheffEdge: "storyboard planning, motion generation, and publish versions in one flow",
    keepScenario: "the deliverable is print design, layered PSD work, or meticulous manual retouching",
    switchScenario: "the deliverable is a recurring stream of scene based videos with voice and subtitles",
    migrationAsset: "approved PSD exports and brand references",
    exampleProject: "a five scene launch teaser that starts from product stills",
    outputType: "vertical and widescreen campaign exports",
    relatedUseCase: "marketing workflow hubs",
  },
  {
    slug: "canva",
    competitor: "Canva",
    category: "template driven social design",
    competitorAudience: "social media managers and small business owners",
    homecheffAudience: "teams producing story led video series",
    competitorEdge: "fast template assembly and brand kits for static assets",
    homecheffEdge: "character continuity and narrative scene control across episodes",
    keepScenario: "the task is a single static post or fast presentation deck",
    switchScenario: "the task is a multi scene narrative with reusable cast and worlds",
    migrationAsset: "brand kit elements, logos, and prior social winners",
    exampleProject: "a monthly product education series with recurring mascots",
    outputType: "platform specific social variants with subtitle safe framing",
    relatedUseCase: "creator dreams and marketing campaigns",
  },
  {
    slug: "capcut",
    competitor: "CapCut",
    category: "mobile and desktop clip editing",
    competitorAudience: "short form editors and trend focused creators",
    homecheffAudience: "creators starting from concepts, scripts, or still images",
    competitorEdge: "speedy timeline edits and trend effects for existing footage",
    homecheffEdge: "generation first workflow from storyboard to motion and publish",
    keepScenario: "the source footage already exists and needs quick cuts",
    switchScenario: "the source footage does not exist and must be generated from story beats",
    migrationAsset: "winning hooks, captions, and pacing references",
    exampleProject: "a weekly hook test program with three story variants",
    outputType: "native vertical outputs and repurposed widescreen cuts",
    relatedUseCase: "creator growth loops and ad testing",
  },
  {
    slug: "premiere-pro",
    competitor: "Adobe Premiere Pro",
    category: "professional timeline editing",
    competitorAudience: "professional editors and post production teams",
    homecheffAudience: "lean marketing and product teams",
    competitorEdge: "deep editorial control for long form and broadcast workflows",
    homecheffEdge: "rapid ideation, generation, and localization before editorial polish",
    keepScenario: "the project needs multicam editing, broadcast conform, or intricate timeline surgery",
    switchScenario: "the project needs speed from brief to first cut with many content variants",
    migrationAsset: "scripts, shot lists, and approved visual references",
    exampleProject: "a launch package with hero edit, ad cuts, and localized captions",
    outputType: "publish ready marketing cuts and optional handoff clips",
    relatedUseCase: "filmmaker and marketing operations",
  },
  {
    slug: "after-effects",
    competitor: "Adobe After Effects",
    category: "motion graphics and compositing",
    competitorAudience: "motion designers and compositors",
    homecheffAudience: "storytelling teams without keyframe heavy pipelines",
    competitorEdge: "expression driven animation and advanced compositing depth",
    homecheffEdge: "scene orchestration, voice, and publishing without manual rigging",
    keepScenario: "the assignment demands bespoke VFX pipelines and frame level keyframing",
    switchScenario: "the assignment demands repeatable motion stories for social and product channels",
    migrationAsset: "style frames, title cards, and brand motion references",
    exampleProject: "a narrative feature explainer with recurring character motion",
    outputType: "campaign clips with consistent tone across channels",
    relatedUseCase: "artist and filmmaker planning",
  },
  {
    slug: "runway",
    competitor: "Runway",
    category: "generative video model workflows",
    competitorAudience: "AI clip experimenters and creative technologists",
    homecheffAudience: "teams shipping full campaigns rather than isolated clips",
    competitorEdge: "rapid model experimentation for single high impact clips",
    homecheffEdge: "end to end production line that keeps scenes connected",
    keepScenario: "the objective is model exploration and one off hero clips",
    switchScenario: "the objective is serialized output with voice, subtitles, and reusable assets",
    migrationAsset: "best performing prompts and still frame references",
    exampleProject: "a two week campaign with ten scenes and three locale variants",
    outputType: "structured campaign bundles ready for publishing",
    relatedUseCase: "series production and localization",
  },
  {
    slug: "pika",
    competitor: "Pika",
    category: "quick prompt to video clips",
    competitorAudience: "social creators producing short exploratory clips",
    homecheffAudience: "story teams building multi scene continuity",
    competitorEdge: "fast experimentation from one image or short prompt",
    homecheffEdge: "story coherence through library assets and production briefs",
    keepScenario: "a single playful clip is enough for the campaign goal",
    switchScenario: "the audience needs a coherent arc across multiple videos",
    migrationAsset: "favorite prompts and visual style references",
    exampleProject: "an episodic character series with weekly publishing cadence",
    outputType: "episode variants with stable naming and subtitles",
    relatedUseCase: "creator dreams and serialized storytelling",
  },
  {
    slug: "invideo",
    competitor: "InVideo",
    category: "template based marketing videos",
    competitorAudience: "marketers assembling stock based assets",
    homecheffAudience: "teams moving toward ownable visual IP",
    competitorEdge: "quick template completion for one off promo clips",
    homecheffEdge: "custom scenes derived from your own assets and references",
    keepScenario: "the brief can be solved with stock footage and template pacing",
    switchScenario: "the brief needs a distinctive visual world and repeatable campaign narrative",
    migrationAsset: "offer copy, logo packs, and customer proof points",
    exampleProject: "a quarter long nurture sequence with evolving story beats",
    outputType: "ad, web, and email variants from one storyboard tree",
    relatedUseCase: "content team scaling with AI",
  },
  {
    slug: "descript",
    competitor: "Descript",
    category: "transcript first audio and video editing",
    competitorAudience: "podcasters and interview editors",
    homecheffAudience: "brands creating visual narratives from scripts",
    competitorEdge: "excellent transcript editing for recorded conversations",
    homecheffEdge: "visual generation pipeline when footage does not yet exist",
    keepScenario: "the core asset is a recorded interview that needs transcript cleanup",
    switchScenario: "the core asset is a script that must become visual scenes",
    migrationAsset: "transcripts, episode outlines, and style references",
    exampleProject: "a thought leadership series with scripted scene illustrations",
    outputType: "social cutdowns and long form explainers with subtitles",
    relatedUseCase: "writer and marketing narratives",
  },
  {
    slug: "elevenlabs",
    competitor: "ElevenLabs",
    category: "voice generation and dubbing",
    competitorAudience: "audio focused teams and API builders",
    homecheffAudience: "video teams that need voice as one integrated layer",
    competitorEdge: "strong voice cloning and standalone dubbing capabilities",
    homecheffEdge: "voice mapped directly to storyboards, scenes, and publish outputs",
    keepScenario: "the immediate requirement is standalone audio generation only",
    switchScenario: "the requirement is complete video production with character voices",
    migrationAsset: "approved voice personas, scripts, and pronunciation notes",
    exampleProject: "a multilingual explainer with character specific narration",
    outputType: "voice plus scene exports across regions",
    relatedUseCase: "localized product explainers and education",
  },
];

const GUIDE_ENTRIES = [
  {
    slug: "breng-je-tekeningen-tot-leven",
    title: "Breng je tekeningen tot leven met AI",
    h1: "Breng je tekeningen tot leven",
    topic: "tekeningen animeren",
    audience: "illustratoren, ouders en makers",
    project: "een korte emotionele video die start met handgetekende illustraties",
    outputType: "verticale social clips en een langere presentatieversie",
    startPoint: "Editor met opgeschoonde scans en referenties",
    relatedUseCase: "artist workflow",
  },
  {
    slug: "van-schets-naar-animatie",
    title: "Van schets naar animatie stap voor stap",
    h1: "Van schets naar animatie",
    topic: "schetsworkflow",
    audience: "beginnende animatiemakers",
    project: "een pilotclip met karakterintro en verhaallijn in drie aktes",
    outputType: "een storyboardversie en een afgewerkte motion render",
    startPoint: "Studio brief met duidelijke stijlregels",
    relatedUseCase: "creator dreams workflow",
  },
  {
    slug: "van-verhaal-naar-video",
    title: "Van verhaal naar video zonder chaos",
    h1: "Van verhaal naar video",
    topic: "verhaalproductie",
    audience: "schrijvers en videomakers",
    project: "een verhalende video met narratie, ondertitels en CTA",
    outputType: "een hoofdvideo plus kanaalspecifieke cutdowns",
    startPoint: "Studio storyboard met scene beats",
    relatedUseCase: "filmmaker workflow",
  },
  {
    slug: "van-boek-naar-film",
    title: "Van boek naar filmische video",
    h1: "Van boek naar film",
    topic: "boekadaptatie",
    audience: "auteurs en uitgevers",
    project: "een boektrailer die personages, conflict en sfeer toont",
    outputType: "festivalteaser, socials en auteurswebsite versie",
    startPoint: "Library met character en world referenties",
    relatedUseCase: "writer workflow",
  },
  {
    slug: "maak-je-eigen-cartoon",
    title: "Maak je eigen cartoonserie met AI",
    h1: "Maak je eigen cartoon",
    topic: "cartoon productie",
    audience: "creators met eigen IP plannen",
    project: "een cartoonaflevering met terugkerende cast en vaste intro",
    outputType: "episodische exports voor YouTube en Reels",
    startPoint: "Characters in Studio en scenes in Projects",
    relatedUseCase: "creator dreams workflow",
  },
  {
    slug: "maak-je-eigen-anime",
    title: "Maak je eigen anime project",
    h1: "Maak je eigen anime",
    topic: "anime pipeline",
    audience: "anime fans en indie storytellers",
    project: "een anime teaser met lore, karakterbeats en cliffhanger",
    outputType: "teaser, trailer en community update clips",
    startPoint: "World bible in Studio",
    relatedUseCase: "gaming workflow",
  },
  {
    slug: "maak-je-eigen-manga",
    title: "Maak je eigen manga en animeer panelen",
    h1: "Maak je eigen manga",
    topic: "manga panels",
    audience: "tekenaars en webcomic makers",
    project: "een panel to motion proof of concept",
    outputType: "social snippets en pitchvideo",
    startPoint: "Editor met panel scans",
    relatedUseCase: "artist workflow",
  },
  {
    slug: "maak-je-eigen-filmstudio",
    title: "Maak je eigen filmstudio met AI tools",
    h1: "Maak je eigen filmstudio",
    topic: "digitale studio opbouw",
    audience: "solo teams en kleine bureaus",
    project: "een complete studio setup met assets, storyboard en publishplan",
    outputType: "klantpresentatie en wekelijkse productiecadans",
    startPoint: "Projects met duidelijke mappenstructuur",
    relatedUseCase: "filmmaker workflow",
  },
  {
    slug: "word-je-eigen-regisseur",
    title: "Word je eigen regisseur in HomeCheff",
    h1: "Word je eigen regisseur",
    topic: "regie en scenebeslissingen",
    audience: "makers die regie willen voeren",
    project: "een regiegedreven productie met feedbackrondes",
    outputType: "finale edit en reviewversies per stakeholder",
    startPoint: "Studio director flow",
    relatedUseCase: "filmmaker workflow",
  },
  {
    slug: "maak-je-eigen-animatieserie",
    title: "Maak je eigen animatieserie die consistent blijft",
    h1: "Maak je eigen animatieserie",
    topic: "episodische animatie",
    audience: "contentmakers met serieuze series plannen",
    project: "een seizoen pilot met drie afleveringsvarianten",
    outputType: "afleveringen, teasers en community updates",
    startPoint: "Library met series canon",
    relatedUseCase: "creator dreams workflow",
  },
  {
    slug: "eigen-contentteam-met-ai",
    title: "Bouw je eigen contentteam met AI",
    h1: "Eigen contentteam met AI",
    topic: "contentoperatie",
    audience: "marketing teams en ondernemers",
    project: "een maandplanning met herbruikbare campagne assets",
    outputType: "weekly social pakket en landingspagina video",
    startPoint: "Marketing brief in Studio",
    relatedUseCase: "marketing workflow",
  },
];

const WORKFLOW_ENTRIES = [
  {
    slug: "artist",
    title: "Artist workflow met HomeCheff Studio",
    h1: "Artist workflow",
    role: "artist teams",
    painPoint: "zij verliezen tijd door telkens opnieuw assets te bouwen voor elk project",
    goal: "een consistente visuele lijn leveren over meerdere clips en campagnes",
    outputType: "portfolio reels, klantvoorstellen en social snippets",
    startPoint: "Editor met style locked referenties",
    relatedUseCase: "tekeningen en manga productie",
  },
  {
    slug: "filmmaker",
    title: "Filmmaker workflow voor snelle productie",
    h1: "Filmmaker workflow",
    role: "filmmakers",
    painPoint: "zij spenderen weken aan pre productie zonder snelle proof of concept",
    goal: "van script naar render gaan met behoud van regiecontrole",
    outputType: "trailers, explainers en localized release cuts",
    startPoint: "Studio storyboard en director notes",
    relatedUseCase: "verhaal naar video en regie trajecten",
  },
  {
    slug: "writer",
    title: "Writer workflow voor visuele verhalen",
    h1: "Writer workflow",
    role: "writers",
    painPoint: "zij hebben sterke verhalen maar missen een betaalbare visualisatieroute",
    goal: "tekstvoordelen omzetten naar overtuigende scenebeleving",
    outputType: "boektrailers, pitch reels en lezerscampagnes",
    startPoint: "Story brief met hoofdstuk beats",
    relatedUseCase: "boekadaptatie en karakterontwikkeling",
  },
  {
    slug: "marketing",
    title: "Marketing workflow voor campagnevolume",
    h1: "Marketing workflow",
    role: "marketing teams",
    painPoint: "zij hebben outputdruk per kanaal maar te weinig productiecapaciteit",
    goal: "meer varianten publiceren zonder kwaliteitsverlies",
    outputType: "ads, web videos en email embeds",
    startPoint: "campagnebrief met kanaaldoelen",
    relatedUseCase: "contentteam en productlanceringen",
  },
  {
    slug: "education",
    title: "Education workflow voor leercontent",
    h1: "Education workflow",
    role: "education teams",
    painPoint: "zij moeten complexe onderwerpen uitleggen met beperkte lestijd",
    goal: "heldere leercontent bouwen die leerlingen echt uitkijken",
    outputType: "lesvideos, recap clips en ouderupdates",
    startPoint: "lesdoelen als storyboard structuur",
    relatedUseCase: "uitlegvideo en stap voor stap gidsen",
  },
  {
    slug: "gaming",
    title: "Gaming workflow voor trailers en lore",
    h1: "Gaming workflow",
    role: "gaming creators",
    painPoint: "zij missen consistente lore visuals tussen updates en promoties",
    goal: "dezelfde wereldidentiteit tonen in elke releasevideo",
    outputType: "trailers, patch updates en community shorts",
    startPoint: "world and character canon in Library",
    relatedUseCase: "anime en episodische content",
  },
  {
    slug: "creator-dreams",
    title: "Creator Dreams workflow voor eigen IP",
    h1: "Creator Dreams workflow",
    role: "ambitieuze creators",
    painPoint: "zij hebben grote creatieve dromen maar geen robuuste productieroutine",
    goal: "eigen serie, cartoon of filmconcept publiceren in vaste cadans",
    outputType: "pilot episodes, trailers en audience updates",
    startPoint: "creator roadmap in Projects",
    relatedUseCase: "cartoon, anime en animatieserie trajecten",
  },
];

const GUIDE_LINKS = GUIDE_ENTRIES.map((g) => ({
  href: `/guides/${g.slug}`,
  label: g.h1,
}));

const ALT_LINKS = ALT_ENTRIES.map((a) => ({
  href: `/alternatives/${a.slug}`,
  label: `${a.competitor} alternative`,
}));

function guidePair(i) {
  return [GUIDE_LINKS[(i + 1) % GUIDE_LINKS.length], GUIDE_LINKS[(i + 4) % GUIDE_LINKS.length]];
}

function altPair(i) {
  return [ALT_LINKS[i % ALT_LINKS.length], ALT_LINKS[(i + 3) % ALT_LINKS.length]];
}

function makeAlternativeConfig(entry, i) {
  const intro = three(
    `${entry.competitor} is strong for ${entry.category}, especially for ${entry.competitorAudience} who need focused tooling.`,
    `HomeCheff addresses a broader production reality for ${entry.homecheffAudience}, where one project must move from concept to publish without tool hopping.`,
    `This ${entry.slug} comparison explains practical fit, migration choices, and how to build repeatable output without sacrificing creative quality.`
  );
  const whoCompetitorFor = three(
    `${entry.competitor} works best when teams value ${entry.competitorEdge} and can invest specialist time per asset.`,
    `The workflow shines when approvals happen on static artifacts before anything is animated or localized.`,
    `If your process already revolves around dedicated experts per discipline, that structure can remain efficient for this tool.`
  );
  const homecheffDifference = three(
    `HomeCheff shifts the center of gravity toward story and production orchestration through ${entry.homecheffEdge}.`,
    `Instead of delivering isolated files, teams coordinate scenes, voices, subtitles, and exports inside one project timeline.`,
    `That structure reduces context switching, shortens approval cycles, and keeps creative intent intact from brief to release.`
  );
  const whenUseCompetitor = three(
    `Keep ${entry.competitor} when ${entry.keepScenario} and the business goal does not require full narrative continuity.`,
    `In these scenarios, deep craft depth in a narrow stage often matters more than end to end speed.`,
    `A hybrid stack is common: preserve specialist tooling where precision is critical, then move downstream when distribution needs expand.`
  );
  const whenUseHomecheff = three(
    `Move to HomeCheff when ${entry.switchScenario} and continuity directly affects conversion performance.`,
    `Teams gain leverage because briefs, assets, and publishing paths stay connected instead of resetting every week.`,
    `This is especially useful when stakeholders request multiple hooks, multiple locales, and rapid iteration from one approved narrative base.`
  );
  const workflowComparison = three(
    `A practical comparison starts with the unit of work: ${entry.competitor} often optimizes one deliverable at a time, while HomeCheff optimizes a reusable production system.`,
    `The system approach matters once your calendar includes recurring launches, seasonal campaigns, or episodic creator formats.`,
    `By treating scenes as reusable production assets, teams can scale output without scaling coordination chaos.`
  );
  const practicalExample = three(
    `Imagine ${entry.exampleProject}, where marketing asks for three versions before Friday and legal asks for subtitle updates in two languages.`,
    `With disconnected tooling, each revision creates duplicated labor and version confusion across files and chats.`,
    `With HomeCheff, the same storyboard base updates once and then repackages into aligned publish outputs with traceable revisions.`
  );
  const limitations = three(
    `${entry.competitor} can feel limiting when narrative continuity, multilingual publishing, and asset reuse become non negotiable.`,
    `Teams usually hit friction around handoffs, naming discipline, and duplicated approval loops between editing and distribution tools.`,
    `Recognizing that boundary early helps you choose a stack that matches long term operating goals rather than one off wins.`
  );
  const competitorStrength = three(
    `One clear strength remains ${entry.competitorEdge}, and that advantage should be acknowledged in fair comparisons.`,
    `If your roadmap depends on specialist craft in that exact area, the competitor can remain a valuable part of the stack.`,
    `The best decisions preserve strengths while removing bottlenecks that slow the full production lifecycle.`
  );
  const homecheffStrength = three(
    `For teams evaluating ${entry.competitor}, HomeCheff strength comes from connected modules: Editor for asset prep, Studio for narrative planning, Motion for generation, and Publish for release control.`,
    `This connected approach is especially useful for ${entry.relatedUseCase}, because teams can version content without rebuilding each deliverable from scratch.`,
    `The advantage grows over time as repeated launches reuse approved assets and keep quality stable across every new project iteration.`
  );
  const pricingNote = three(
    `For ${entry.competitor} comparisons, budget decisions should reflect full production effort, not only headline subscription cost for one stage.`,
    `HomeCheff credits make usage visible at the action level so ${entry.homecheffAudience} can forecast campaign cost before render spikes.`,
    `In ${entry.category} heavy workflows, this visibility supports clearer margin planning than ad hoc rework hidden across disconnected tools.`
  );
  const migrationTip = three(
    `Start migration by importing ${entry.migrationAsset}, then recreate one high value workflow end to end before moving everything.`,
    `Choose a measurable pilot with clear success criteria such as turnaround time, revision count, and publish readiness.`,
    `Once the pilot proves value, templatize the process in Projects so the team can repeat it reliably every week.`
  );

  const productionLine = {
    audience: entry.homecheffAudience,
    goal: entry.goal ?? "ship consistent video output",
    painPoint: `Their blocker is that ${entry.painPoint ?? "handoffs break momentum across tools and teams"}.`,
    exampleProject: entry.exampleProject,
    workflowAngle: `cross functional delivery for ${entry.relatedUseCase}`,
    outputType: entry.outputType,
    recommendedStartingPoint: "Studio storyboard planning after Editor references are prepared",
    relatedUseCase: entry.relatedUseCase,
    conversionReason: "A connected production line converts better because every version stays aligned to one narrative source",
  };

  const comparisonRows = [
    {
      feature: "Best primary use",
      homecheff: "Story-first multi-scene production with publish control",
      other: `${entry.competitor} for focused ${entry.category}`,
    },
    {
      feature: "Workflow center",
      homecheff: "Reusable storyboard and project system",
      other: "Single-stage specialist workspace",
    },
    {
      feature: "Localization path",
      homecheff: "Integrated subtitles and translated variants",
      other: "Often requires separate handoff steps",
    },
    {
      feature: "Version management",
      homecheff: "Scene-linked revisions and publish variants",
      other: "Manual file branching and naming discipline",
    },
    {
      feature: "Scale behavior",
      homecheff: "Compounding efficiency with reuse",
      other: "Higher friction as output volume increases",
    },
  ];

  const studioCta =
    entry.slug === "elevenlabs"
      ? { href: "/studio/characters/new", label: "Map voices to characters" }
      : { href: "/studio/storyboards/new", label: "Start a storyboard" };

  return {
    slug: entry.slug,
    competitor: entry.competitor,
    category: entry.category,
    intro,
    whoCompetitorFor,
    homecheffDifference,
    whenUseCompetitor,
    whenUseHomecheff,
    workflowComparison,
    practicalExample,
    limitations,
    competitorStrength,
    homecheffStrength,
    pricingNote,
    migrationTip,
    productionLine,
    studioCta,
    relatedGuides: guidePair(i),
    comparisonRows,
  };
}

function guideStepParagraph(entry, stepName, i, j) {
  return three(
    `In stap ${i + 1} voor ${entry.topic} richt je je op ${stepName}, zodat het verhaal niet alleen visueel sterk is maar ook operationeel uitvoerbaar.`,
    `Voor ${entry.audience} betekent dit dat elke scene een duidelijk doel krijgt, met concrete input, heldere reviewmomenten, en minimale verspilling in revisies.`,
    `Deze aanpak werkt juist voor ${entry.slug} omdat je vroeg keuzes vastlegt die later zorgen voor snellere renders en stabielere publicatiekwaliteit.`
  );
}

function guideFaq(entry) {
  return [
    {
      question: `Hoe start ik met ${entry.h1.toLowerCase()} zonder veel ervaring?`,
      answer: `Begin met een klein pilotproject binnen ${entry.startPoint} en werk in korte feedbackcycli. Zo bouw je vertrouwen op terwijl je tegelijk een bruikbaar publiceerbaar resultaat neerzet.`,
    },
    {
      question: "Hoe voorkom ik dat scenes inconsistent worden?",
      answer:
        "Leg stijlreferenties, personages en locaties vroeg vast in Library en dwing die keuzes af in Studio. Consistentie ontstaat door discipline in je bronmateriaal, niet door extra renderpogingen achteraf.",
    },
    {
      question: "Wanneer gebruik ik Motion in deze workflow?",
      answer:
        "Gebruik Motion pas nadat de storyboardstills en kernnarratief zijn goedgekeurd. Dat voorkomt dure rerenders en houdt credits beschikbaar voor echte kwaliteitsverbetering.",
    },
    {
      question: "Hoe houd ik kosten en credits onder controle?",
      answer:
        "Werk met een vooraf gepland scenebudget en toets tussentijds op resultaat versus doel. Door die ritmiek blijft productie voorspelbaar en voorkom je spontane uitgaven aan lage impact renders.",
    },
    {
      question: "Welke pagina helpt me na deze gids verder?",
      answer: `Koppel deze aanpak direct aan ${entry.relatedUseCase} en bouw daarna een herhaalbare template in Projects. Daarmee transformeer je eenmalig experimenteren naar een duurzame contentroutine.`,
    },
  ];
}

function makeGuideConfig(entry, i) {
  const intro = three(
    `${entry.h1} vraagt meer dan een losse prompt; het vraagt een productieaanpak die planning, assets, en distributie vanaf dag een samenbrengt.`,
    `Voor ${entry.audience} is dat precies waarom HomeCheff werkt: je stuurt op resultaat in plaats van op toolwissels en losse bestanden.`,
    `Deze gids geeft je een concreet pad waarmee ${entry.project} haalbaar wordt binnen een realistische weekplanning.`
  );

  const steps = [
    "brief en doelafbakening",
    "asset selectie en referenties",
    "storyboard sequencing",
    "voice en subtitle ontwerp",
    "motion renderstrategie",
    "publish en distributie",
  ].map((name, stepIndex) => ({
    heading: `Stap ${stepIndex + 1} - ${name}`,
    paragraphs: [
      guideStepParagraph(entry, name, stepIndex, 0),
      three(
        `In stap ${stepIndex + 1} rond ${name} maak je expliciet wie beslist over kwaliteit, zodat feedback voor ${entry.slug} niet blijft hangen tussen creatieve voorkeur en zakelijke doelstellingen.`,
        `Documenteer in deze fase ook wat je niet gaat doen, want heldere scopegrenzen versnellen ${entry.topic} productie veel meer dan extra tools.`,
        `Wanneer deze afspraken op dit punt helder zijn, wordt de overgang naar stap ${stepIndex + 2 <= 6 ? stepIndex + 2 : 6} voorspelbaar en behoudt het team momentum richting publicatie.`
      ),
    ],
  }));

  const mistakes = [
    `Te vroeg motion renderen voor ${entry.topic} zonder goedgekeurde stills in Studio.`,
    `Geen vaste stijlreferentie voor ${entry.slug} in Library bewaren.`,
    `Call-to-action voor ${entry.audience} pas op het einde bedenken.`,
    `Kanaalverschillen negeren bij Publish-exports voor ${entry.outputType}.`,
    `Feedback op ${entry.slug} verzamelen zonder duidelijke eigenaar per scene.`,
  ];

  const mistakesFix = three(
    `De meest voorkomende fout bij ${entry.topic} is versnellen naar Motion voordat scenevolgorde en boodschap zijn vastgelegd.`,
    `Los dit op voor ${entry.slug} door tien extra minuten in Studio te investeren vóór renders — goedkoper dan drie clips opnieuw produceren.`,
    `${entry.audience} die deze preflight discipline volgen, publiceren ${entry.outputType} sneller zonder kwaliteitsdip.`
  );

  const creditsSignup = three(
    `Bekijk /pricing vóór batch-renders voor ${entry.slug}, zodat ${entry.audience} weten welke Studio-acties gepland zijn.`,
    `Maak een gratis account op /signup om ${entry.topic} te piloten met een beperkt aantal scenes.`,
    `Start klein, meet resultaat, en schaal pas wanneer Library-hergebruik op ${entry.slug} aantoonbaar werkt.`
  );

  const publishIterate = three(
    `Noem Publish-versies voor ${entry.slug} duidelijk per kanaal — bijvoorbeeld platform, datum, en hook-variant — zodat je volgende week sneller iterereert.`,
    `${entry.audience} die versienamen consequent gebruiken, vermijden dubbel werk bij ${entry.topic} campagnes.`,
    `Koppel elke export aan het doel uit je brief, niet alleen aan het bestandstype dat een platform vraagt.`
  );

  const exampleProject = three(
    `Voorbeeldproject: ${entry.project}.`,
    `Je bouwt eerst een heldere kernversie, daarna maak je kanaalafgeleiden die dezelfde verhaallijn behouden maar verschillen in hook en tempo.`,
    `Die aanpak levert sneller leerdata op omdat je varianten inhoudelijk vergelijkbaar blijven en dus beter te evalueren zijn.`
  );

  const studioEditorMotion = three(
    `Start in ${entry.startPoint}, zodat je assets en context vroeg op orde zijn voordat motionkosten oplopen.`,
    `Verplaats daarna de regie naar Studio voor scenevolgorde, narratief ritme, en goedkeuringsmomenten met stakeholders.`,
    `Gebruik Motion pas wanneer de basis klopt, zodat renders bijdragen aan impact in plaats van aan herstelwerk.`
  );

  const creditsNote = three(
    `Voor ${entry.slug} behandel je credits als productiebudget per fase, niet als losse aankopen per knop.`,
    `Door vooraf per scene een maximaal testaantal te kiezen, voorkomt ${entry.audience} dat het team in eindeloze microrevisies belandt.`,
    "Deze discipline maakt kosten voorspelbaar en vergroot de kans dat je consistent binnen deadline publiceert."
  );

  const publishingTips = three(
    `Publiceer ${entry.outputType} vanuit een centrale bron, zodat elk kanaal voor ${entry.slug} dezelfde merkboodschap uitstraalt maar wel de juiste vorm krijgt.`,
    `Meet per variant niet alleen views, maar ook completion, CTA-kliks, en feedbackkwaliteit van ${entry.audience}.`,
    "Gebruik die data om de volgende batch te verbeteren op strategie in plaats van op willekeurige creatieve voorkeur."
  );

  const productionLine = {
    audience: entry.audience,
    goal: `van ${entry.topic} naar publiceerbare videos gaan met herhaalbaar proces`,
    painPoint: "Veel teams verliezen tempo door ad hoc beslissingen en onduidelijke overdrachten tussen fases.",
    exampleProject: entry.project,
    workflowAngle: `een vaste lijn voor ${entry.relatedUseCase}`,
    outputType: entry.outputType,
    recommendedStartingPoint: entry.startPoint,
    relatedUseCase: entry.relatedUseCase,
    conversionReason:
      "Een consistente productielijn verhoogt conversie omdat boodschap, visuele stijl, en call-to-action in elke variant op elkaar blijven afgestemd",
  };

  const faqs = guideFaq(entry);

  const internalLinks = [
    guidePair(i)[0],
    guidePair(i)[1],
    { href: `/workflows/${WORKFLOW_ENTRIES[i % WORKFLOW_ENTRIES.length].slug}`, label: WORKFLOW_ENTRIES[i % WORKFLOW_ENTRIES.length].h1 },
    altPair(i)[0],
  ];

  return {
    slug: entry.slug,
    title: entry.title,
    h1: entry.h1,
    eyebrow: "Gids",
    intro,
    steps,
    mistakes,
    mistakesFix,
    exampleProject,
    studioEditorMotion,
    creditsNote,
    creditsSignup,
    publishingTips,
    publishIterate,
    productionLine,
    faqs,
    studioCta: { href: "/studio/storyboards/new", label: "Start je storyboard" },
    internalLinks,
  };
}

function workflowFaq(entry) {
  return [
    {
      question: `Wat maakt deze ${entry.h1.toLowerCase()} anders dan losse tools combineren?`,
      answer:
        "Deze workflow koppelt planning, assetbeheer, renderlogica en distributie in een doorlopende keten. Daardoor daalt overdrachtsfrictie en stijgt de voorspelbaarheid van outputkwaliteit.",
    },
    {
      question: "Hoe schaal ik output zonder dat kwaliteit daalt?",
      answer:
        "Werk met herbruikbare templates en sluit elke sprint af met meetbare leerpunten per kanaal. Zo groeit volume samen met discipline in plaats van met chaotische herhalingen.",
    },
    {
      question: "Wanneer moet ik processen aanscherpen?",
      answer:
        "Zodra feedback rondes terugkerend dezelfde fouten tonen, is dat een procesprobleem en geen creatief toeval. Leg dan extra checkpoints vast in storyboard en publishfase.",
    },
    {
      question: "Welke metrics zijn het meest nuttig?",
      answer:
        "Gebruik completion, CTR, revisieaantal en tijd tot publicatie als kernset. Die combinatie laat zowel creatieve effectiviteit als operationele efficiëntie zien.",
    },
    {
      question: "Waar begin ik vandaag concreet mee?",
      answer:
        "Start met een pilot in een beperkt format, documenteer elke stap, en schaal pas na aantoonbaar resultaat. Dat maakt groei beheersbaar en versnelt teamacceptatie.",
    },
  ];
}

function makeWorkflowConfig(entry, i) {
  const intro = four(
    `De ${entry.h1.toLowerCase()} is ontworpen voor ${entry.role} die consistent willen groeien zonder productiechaos, zelfs wanneer deadlines korter worden en stakeholders tegelijk verschillende varianten verwachten.`,
    "In plaats van losse tools op goed geluk te koppelen, bouw je een gecontroleerde lijn waarin creatieve keuzes, reviewregels, en operationele afspraken elkaar versterken.",
    `Daardoor wordt ${entry.goal} geen ambitie op papier maar een herhaalbaar systeem dat elke week resultaat oplevert met minder rework.`,
    "Je team wint niet alleen snelheid, maar ook voorspelbaarheid in kwaliteit, omdat elke release dezelfde logica volgt van brief tot publicatie."
  );

  const audienceWorkflow = four(
    `Voor ${entry.role} begint een sterke workflow met een gedeeld beslismodel: wat telt als klaar, wie keurt goed, en welke scenecriteria verplicht zijn voor release.`,
    "Zonder die basis glijdt productie af naar losse voorkeuren, waardoor feedbackrondes zich opstapelen en deadlines onbetrouwbaar worden voor zowel creators als business teams.",
    "Met deze structuur blijft het team gefocust op impact, niet op discussies over randdetails die weinig bijdragen aan conversie of merkherkenning.",
    "Door vooraf te bepalen welke metrics per scene belangrijk zijn, kan je sneller sturen op resultaten en voorkom je emotionele besluitvorming in late fases."
  );

  const soloTeam = four(
    `Deze ${entry.slug} aanpak werkt zowel voor solo creators als voor kleine teams, omdat rollen expliciet worden gemaakt zonder extra managementlagen of omslachtige overlegstructuren.`,
    `Een solo maker in ${entry.role} context wint snelheid door vaste sjablonen, terwijl teams winnen door heldere overdracht tussen briefing, productie, review, en distributie.`,
    "In beide gevallen ontstaat rust omdat iedereen weet welke stap nu prioriteit heeft en wat de volgende stap vereist voordat resources worden ingezet.",
    "Die duidelijkheid verlaagt contextwissels, verkort handoff-tijd, en maakt capaciteit beter planbaar wanneer plots extra varianten nodig zijn."
  );

  const libraryUse = four(
    `Voor ${entry.slug} is Library de ruggengraat van de workflow: goedgekeurde assets, stijlafspraken, referenties en merkbeperkingen blijven centraal beschikbaar voor elke nieuwe productie.`,
    `Dat voorkomt visuele drift in ${entry.relatedUseCase} en verkleint de kans dat teams terugvallen op generieke stockoplossingen onder tijdsdruk.`,
    "Hoe consistenter je Library discipline, hoe sneller je nieuwe varianten kunt lanceren zonder kwaliteitsverlies of identiteitsverlies tussen campagnes.",
    "Bovendien verkleint centrale assetgovernance de kans op compliancefouten, omdat alleen gevalideerde bronmaterialen opnieuw worden gebruikt."
  );

  const voiceSubtitlePublish = four(
    `In ${entry.h1.toLowerCase()} worden voice, subtitles en publishregels vroeg gedefinieerd, zodat lokalisatie geen dure nagedachte wordt maar een ingebouwde capaciteit vanaf de eerste versie.`,
    `Door kanaalverwachtingen vooraf te modelleren, kunnen ${entry.role} met minimale extra inspanning meerdere versies uit dezelfde kernnarratief uitrollen.`,
    "Dat levert hogere operationele hefboom op, vooral wanneer dezelfde boodschap wekelijks in verschillende markten moet landen met consistente toon en timing.",
    "Deze werkwijze verhoogt ook toegankelijkheid, omdat ondertitels en voiceconsistentie standaard onderdeel zijn van kwaliteitscontrole in plaats van last-minute toevoeging."
  );

  const conversionPath = four(
    `Voor ${entry.slug} groeit conversie wanneer elke scene een meetbaar doel dient: aandacht vasthouden, waarde tonen, bezwaar wegnemen, of actie uitlokken.`,
    "Deze workflow vertaalt dat principe naar concrete productiechecks, zodat creatieve energie niet verdwijnt in esthetische experimenten zonder zakelijk effect.",
    `Na publicatie voer je leercycli door op basis van data, waardoor ${entry.goal} in volgende iteraties zowel sneller als effectiever wordt.`,
    "Door prestaties per variant te vergelijken ontstaat een lerend systeem dat structureel betere scripts, betere scenevolgorde, en hogere CTA-resultaten oplevert."
  );

  const productionLine = {
    audience: entry.role,
    goal: `${entry.goal} via een vaste sprintstructuur met duidelijke reviewmomenten per fase, vaste besliscriteria, en terugkerende postmortems die leermomenten direct vertalen naar de volgende productiecyclus`,
    painPoint: `${entry.painPoint}, vooral wanneer meerdere stakeholders laat in het proces nieuwe eisen toevoegen zonder gedeeld besliskader en zonder zicht op consequenties voor planning, budget, en kwaliteit`,
    exampleProject: `Een pilotprogramma dat ${entry.outputType} oplevert met voorspelbare releasekwaliteit, lagere revisielast, duidelijke eigenaarschap per stap, en een transparante evaluatie van wat inhoudelijk en operationeel het best presteert.`,
    workflowAngle: `operationele standaardisering voor ${entry.relatedUseCase} met expliciete kwaliteitschecks tussen brief, render, en publish, zodat varianten schaalbaar blijven zonder dat creatieve richting verwatert`,
    outputType: `${entry.outputType} die per kanaal consistent blijven in boodschap, visuele identiteit, en call-to-action, met duidelijke metadata zodat analyse en hergebruik in latere campagnes eenvoudiger wordt`,
    recommendedStartingPoint: `${entry.startPoint} zodat scope, assets, en kwaliteitscriteria vroeg vastliggen en het team al voor de eerste render weet welke keuzes niet opnieuw ter discussie staan`,
    relatedUseCase: `${entry.relatedUseCase} waarin hergebruik en consistentie direct invloed hebben op performance, teambelasting, en de snelheid waarmee nieuwe initiatieven gepubliceerd kunnen worden`,
    conversionReason:
      "Door dezelfde productielogica per release toe te passen, ontstaan betrouwbaardere resultaten, minder verspilling in correctierondes, en duidelijkere verbanden tussen creatieve keuzes en businessimpact",
  };

  const dailyUseCases = [
    "Briefs vertalen naar sceneplanning met meetbaar doel.",
    "Assets en references standaardiseren in een gedeelde Library.",
    "Renderbeslissingen nemen op basis van impact in plaats van impuls.",
    "Kanaalspecifieke variants publiceren met consistente branding.",
  ];

  const linkedGuides = guidePair(i);
  const linkedAlternatives = altPair(i);

  return {
    slug: entry.slug,
    title: entry.title,
    h1: entry.h1,
    intro,
    audienceWorkflow,
    dailyUseCases,
    soloTeam,
    libraryUse,
    voiceSubtitlePublish,
    conversionPath,
    productionLine,
    faqs: workflowFaq(entry),
    linkedGuides,
    linkedAlternatives,
    studioCta: { href: "/studio/storyboards/new", label: "Open Studio" },
  };
}

const alternatives = ALT_ENTRIES.map(makeAlternativeConfig);
const guides = GUIDE_ENTRIES.map(makeGuideConfig);
const workflows = WORKFLOW_ENTRIES.map(makeWorkflowConfig);

if (alternatives.length !== 10 || guides.length !== 11 || workflows.length !== 7) {
  throw new Error("Wave 1 config counts are incorrect");
}

const paragraphRegistry = new Set();
function ensureUniqueParagraph(label, text) {
  ensureParagraphRules(label, text);
  if (paragraphRegistry.has(text)) {
    throw new Error(`Duplicate paragraph detected: ${label}`);
  }
  paragraphRegistry.add(text);
}

for (const c of alternatives) {
  [
    "intro",
    "whoCompetitorFor",
    "homecheffDifference",
    "whenUseCompetitor",
    "whenUseHomecheff",
    "workflowComparison",
    "practicalExample",
    "limitations",
    "competitorStrength",
    "homecheffStrength",
    "pricingNote",
    "migrationTip",
  ].forEach((key) => ensureUniqueParagraph(`alternative:${c.slug}:${key}`, c[key]));
}

for (const c of guides) {
  ensureUniqueParagraph(`guide:${c.slug}:intro`, c.intro);
  ensureUniqueParagraph(`guide:${c.slug}:exampleProject`, c.exampleProject);
  ensureUniqueParagraph(`guide:${c.slug}:studioEditorMotion`, c.studioEditorMotion);
  ensureUniqueParagraph(`guide:${c.slug}:creditsNote`, c.creditsNote);
  ensureUniqueParagraph(`guide:${c.slug}:publishingTips`, c.publishingTips);
  c.steps.forEach((step, stepIndex) => {
    step.paragraphs.forEach((p, pIndex) => {
      ensureUniqueParagraph(`guide:${c.slug}:step${stepIndex}:p${pIndex}`, p);
    });
  });
}

for (const c of workflows) {
  [
    "intro",
    "audienceWorkflow",
    "soloTeam",
    "libraryUse",
    "voiceSubtitlePublish",
    "conversionPath",
  ].forEach((key) => ensureUniqueParagraph(`workflow:${c.slug}:${key}`, c[key]));
}

function renderLink(link) {
  return `{ href: "${esc(link.href)}", label: "${esc(link.label)}" }`;
}

function renderFaq(faq) {
  return `{
      question: "${esc(faq.question)}",
      answer: "${esc(faq.answer)}",
    }`;
}

const alternativesFile = `import type { AlternativeWave1Config } from "@/lib/seo/seo-content-wave1-builder";

export const ALTERNATIVES_WAVE1_CONFIG: AlternativeWave1Config[] = [
${alternatives
  .map(
    (c) => `  {
    slug: "${esc(c.slug)}",
    competitor: "${esc(c.competitor)}",
    category: "${esc(c.category)}",
    intro: "${esc(c.intro)}",
    whoCompetitorFor: "${esc(c.whoCompetitorFor)}",
    homecheffDifference: "${esc(c.homecheffDifference)}",
    whenUseCompetitor: "${esc(c.whenUseCompetitor)}",
    whenUseHomecheff: "${esc(c.whenUseHomecheff)}",
    workflowComparison: "${esc(c.workflowComparison)}",
    practicalExample: "${esc(c.practicalExample)}",
    limitations: "${esc(c.limitations)}",
    competitorStrength: "${esc(c.competitorStrength)}",
    homecheffStrength: "${esc(c.homecheffStrength)}",
    pricingNote: "${esc(c.pricingNote)}",
    migrationTip: "${esc(c.migrationTip)}",
    productionLine: {
      audience: "${esc(c.productionLine.audience)}",
      goal: "${esc(c.productionLine.goal)}",
      painPoint: "${esc(c.productionLine.painPoint)}",
      exampleProject: "${esc(c.productionLine.exampleProject)}",
      workflowAngle: "${esc(c.productionLine.workflowAngle)}",
      outputType: "${esc(c.productionLine.outputType)}",
      recommendedStartingPoint: "${esc(c.productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(c.productionLine.relatedUseCase)}",
      conversionReason: "${esc(c.productionLine.conversionReason)}",
    },
    studioCta: ${renderLink(c.studioCta)},
    relatedGuides: [
      ${renderLink(c.relatedGuides[0])},
      ${renderLink(c.relatedGuides[1])},
    ],
    comparisonRows: [
      ${c.comparisonRows
        .map(
          (r) => `{
      feature: "${esc(r.feature)}",
      homecheff: "${esc(r.homecheff)}",
      other: "${esc(r.other)}",
    }`
        )
        .join(",\n      ")},
    ],
  }`
  )
  .join(",\n")}
];
`;

const guidesFile = `import type { GuideWave1Config } from "@/lib/seo/seo-content-wave1-builder";

export const GUIDES_WAVE1_CONFIG: GuideWave1Config[] = [
${guides
  .map(
    (c) => `  {
    slug: "${esc(c.slug)}",
    title: "${esc(c.title)}",
    h1: "${esc(c.h1)}",
    eyebrow: "${esc(c.eyebrow)}",
    intro: "${esc(c.intro)}",
    steps: [
      ${c.steps
        .map(
          (s) => `{
        heading: "${esc(s.heading)}",
        paragraphs: [
          "${esc(s.paragraphs[0])}",
          "${esc(s.paragraphs[1])}",
        ],
      }`
        )
        .join(",\n      ")}
    ],
    mistakes: [
      ${c.mistakes.map((m) => `"${esc(m)}"`).join(",\n      ")}
    ],
    mistakesFix: "${esc(c.mistakesFix)}",
    exampleProject: "${esc(c.exampleProject)}",
    studioEditorMotion: "${esc(c.studioEditorMotion)}",
    creditsNote: "${esc(c.creditsNote)}",
    creditsSignup: "${esc(c.creditsSignup)}",
    publishingTips: "${esc(c.publishingTips)}",
    publishIterate: "${esc(c.publishIterate)}",
    productionLine: {
      audience: "${esc(c.productionLine.audience)}",
      goal: "${esc(c.productionLine.goal)}",
      painPoint: "${esc(c.productionLine.painPoint)}",
      exampleProject: "${esc(c.productionLine.exampleProject)}",
      workflowAngle: "${esc(c.productionLine.workflowAngle)}",
      outputType: "${esc(c.productionLine.outputType)}",
      recommendedStartingPoint: "${esc(c.productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(c.productionLine.relatedUseCase)}",
      conversionReason: "${esc(c.productionLine.conversionReason)}",
    },
    faqs: [
      ${c.faqs.map((f) => renderFaq(f)).join(",\n      ")}
    ],
    studioCta: ${renderLink(c.studioCta)},
    internalLinks: [
      ${c.internalLinks.map((l) => renderLink(l)).join(",\n      ")}
    ],
  }`
  )
  .join(",\n")}
];
`;

const workflowsFile = `import type { WorkflowWave1Config } from "@/lib/seo/seo-content-wave1-builder";

export const WORKFLOWS_WAVE1_CONFIG: WorkflowWave1Config[] = [
${workflows
  .map(
    (c) => `  {
    slug: "${esc(c.slug)}",
    title: "${esc(c.title)}",
    h1: "${esc(c.h1)}",
    intro: "${esc(c.intro)}",
    audienceWorkflow: "${esc(c.audienceWorkflow)}",
    dailyUseCases: [
      ${c.dailyUseCases.map((u) => `"${esc(u)}"`).join(",\n      ")}
    ],
    soloTeam: "${esc(c.soloTeam)}",
    libraryUse: "${esc(c.libraryUse)}",
    voiceSubtitlePublish: "${esc(c.voiceSubtitlePublish)}",
    conversionPath: "${esc(c.conversionPath)}",
    productionLine: {
      audience: "${esc(c.productionLine.audience)}",
      goal: "${esc(c.productionLine.goal)}",
      painPoint: "${esc(c.productionLine.painPoint)}",
      exampleProject: "${esc(c.productionLine.exampleProject)}",
      workflowAngle: "${esc(c.productionLine.workflowAngle)}",
      outputType: "${esc(c.productionLine.outputType)}",
      recommendedStartingPoint: "${esc(c.productionLine.recommendedStartingPoint)}",
      relatedUseCase: "${esc(c.productionLine.relatedUseCase)}",
      conversionReason: "${esc(c.productionLine.conversionReason)}",
    },
    faqs: [
      ${c.faqs.map((f) => renderFaq(f)).join(",\n      ")}
    ],
    linkedGuides: [
      ${c.linkedGuides.map((l) => renderLink(l)).join(",\n      ")}
    ],
    linkedAlternatives: [
      ${c.linkedAlternatives.map((l) => renderLink(l)).join(",\n      ")}
    ],
    studioCta: ${renderLink(c.studioCta)},
  }`
  )
  .join(",\n")}
];
`;

const contentFile = `import {
  buildAlternativeWave1Page,
  buildGuideWave1Page,
  buildWorkflowWave1Page,
} from "@/lib/seo/seo-content-wave1-builder";
import type { SeoContentPage } from "@/lib/seo/seo-content-types";
import { ALTERNATIVES_WAVE1_CONFIG } from "@/lib/seo/alternatives-wave1-config";
import { GUIDES_WAVE1_CONFIG } from "@/lib/seo/guides-wave1-config";
import { WORKFLOWS_WAVE1_CONFIG } from "@/lib/seo/workflows-wave1-config";

export const ALTERNATIVE_WAVE1_SLUGS = ALTERNATIVES_WAVE1_CONFIG.map((c) => c.slug);
export const GUIDE_WAVE1_SLUGS = GUIDES_WAVE1_CONFIG.map((c) => c.slug);
export const WORKFLOW_WAVE1_SLUGS = WORKFLOWS_WAVE1_CONFIG.map((c) => c.slug);

export const ALTERNATIVES_WAVE1_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  ALTERNATIVES_WAVE1_CONFIG.map((config) => [config.slug, buildAlternativeWave1Page(config)])
);

export const GUIDES_WAVE1_CONTENT: Record<string, SeoContentPage> = Object.fromEntries(
  GUIDES_WAVE1_CONFIG.map((config) => [config.slug, buildGuideWave1Page(config)])
);

export const WORKFLOWS_WAVE1_CONTENT = Object.fromEntries(
  WORKFLOWS_WAVE1_CONFIG.map((config) => [config.slug, buildWorkflowWave1Page(config)])
);
`;

writeFileSync(join(ROOT, "src/lib/seo/alternatives-wave1-config.ts"), alternativesFile);
writeFileSync(join(ROOT, "src/lib/seo/guides-wave1-config.ts"), guidesFile);
writeFileSync(join(ROOT, "src/lib/seo/workflows-wave1-config.ts"), workflowsFile);
writeFileSync(join(ROOT, "src/lib/seo/seo-wave1-content.ts"), contentFile);

const allWave1ParagraphWords =
  alternatives.reduce(
    (sum, c) =>
      sum +
      words(c.intro) +
      words(c.whoCompetitorFor) +
      words(c.homecheffDifference) +
      words(c.whenUseCompetitor) +
      words(c.whenUseHomecheff) +
      words(c.workflowComparison) +
      words(c.practicalExample) +
      words(c.limitations) +
      words(c.competitorStrength) +
      words(c.homecheffStrength) +
      words(c.pricingNote) +
      words(c.migrationTip),
    0
  ) +
  guides.reduce(
    (sum, c) =>
      sum +
      words(c.intro) +
      words(c.exampleProject) +
      words(c.studioEditorMotion) +
      words(c.creditsNote) +
      words(c.publishingTips) +
      c.steps.reduce((acc, s) => acc + words(s.paragraphs[0]) + words(s.paragraphs[1]), 0),
    0
  ) +
  workflows.reduce(
    (sum, c) =>
      sum +
      words(c.intro) +
      words(c.audienceWorkflow) +
      words(c.soloTeam) +
      words(c.libraryUse) +
      words(c.voiceSubtitlePublish) +
      words(c.conversionPath),
    0
  );

console.log(
  `Generated Wave 1 files: alternatives=${alternatives.length}, guides=${guides.length}, workflows=${workflows.length}, pages=${
    alternatives.length + guides.length + workflows.length
  }, paragraphWords=${allWave1ParagraphWords}`
);
