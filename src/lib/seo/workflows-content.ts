import type { SeoContentPage, SeoContentLink } from "@/lib/seo/seo-content-types";

export type WorkflowHub = SeoContentPage & {
  linkedGuides: SeoContentLink[];
  linkedAlternatives: SeoContentLink[];
  productLinks: SeoContentLink[];
};

function workflowHub(
  slug: string,
  title: string,
  metaDescription: string,
  h1: string,
  eyebrow: string,
  intro: string,
  sections: SeoContentPage["sections"],
  faqs: SeoContentPage["faqs"],
  linkedGuides: SeoContentLink[],
  linkedAlternatives: SeoContentLink[],
  productLinks: SeoContentLink[],
  studioCta: SeoContentLink
): WorkflowHub {
  return {
    slug,
    path: `/workflows/${slug}`,
    title,
    metaDescription,
    h1,
    eyebrow,
    intro,
    sections,
    faqs,
    internalLinks: [...linkedGuides, ...linkedAlternatives, ...productLinks],
    linkedGuides,
    linkedAlternatives,
    productLinks,
    studioCta,
    locale: "nl",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/workflows", label: "Workflows" },
      { href: `/workflows/${slug}`, label: h1 },
    ],
  };
}

export const WORKFLOW_SLUGS = [
  "artist",
  "filmmaker",
  "writer",
  "marketing",
  "education",
  "gaming",
  "creator-dreams",
] as const;

export type WorkflowSlug = (typeof WORKFLOW_SLUGS)[number];

export const WORKFLOWS_CONTENT: Record<WorkflowSlug, WorkflowHub> = {
  artist: workflowHub(
    "artist",
    "Artist workflows",
    "Workflow voor tekenaars en illustratoren: van schets en tekening naar scene-beelden en animatie in HomeCheff Studio.",
    "Artist workflows",
    "Workflow",
    "Tekenaars willen beweging zonder een hele animatieopleiding. HomeCheff Studio verbindt Editor (upload en fusion), Studio (scènes) en Motion (animatie) zodat je stijl behouden blijft.",
    [
      {
        heading: "Typische artist-route",
        paragraphs: [
          "Upload in Editor → verfijn asset → storyboard in Studio → scene-image → Motion clip → optioneel Publish.",
        ],
        bullets: [
          "Kindertekeningen en schetsen",
          "Illustraties en character art",
          "Manga- en comic-stijl panels",
          "Reference-driven scene generation",
        ],
      },
      {
        heading: "Waarom Library belangrijk is",
        paragraphs: [
          "Je lijnvoering en personages blijven beschikbaar voor elke nieuwe scène. Geen opnieuw uploaden per clip.",
        ],
      },
    ],
    [
      {
        question: "Moet ik vector tekenen?",
        answer: "Nee. Raster uploads (PNG/JPG) werken uitstekend.",
      },
      {
        question: "Photoshop alternatief?",
        answer: "Voor video-first artists: /alternatives/photoshop.",
      },
      {
        question: "After Effects nodig?",
        answer: "Niet voor basis scene-animatie. Zie /alternatives/after-effects.",
      },
      {
        question: "Eerste gids",
        answer: "/guides/breng-je-tekeningen-tot-leven is de populairste start.",
      },
      {
        question: "Credits",
        answer: "Zie /pricing voor Editor, Studio en Motion acties.",
      },
    ],
    [
      { href: "/guides/breng-je-tekeningen-tot-leven", label: "Tekeningen tot leven" },
      { href: "/guides/van-schets-naar-animatie", label: "Van schets naar animatie" },
      { href: "/guides/maak-je-eigen-manga", label: "Maak je eigen manga" },
    ],
    [
      { href: "/alternatives/photoshop", label: "Photoshop alternatief" },
      { href: "/alternatives/after-effects", label: "After Effects alternatief" },
    ],
    [
      { href: "/editor", label: "Editor" },
      { href: "/library", label: "Library" },
      { href: "/animate/instant", label: "Motion" },
    ],
    { href: "/editor/start", label: "Start in Editor" }
  ),

  filmmaker: workflowHub(
    "filmmaker",
    "Filmmaker workflows",
    "Filmmaker workflow: van verhaal en storyboard naar video, stem en publicatie in HomeCheff Studio.",
    "Filmmaker workflows",
    "Workflow",
    "Filmmakers plannen eerst, renderen later. HomeCheff Studio ondersteunt acts, scènes, director review, motion renders en meertalige publicatie — zonder een traditionele NLE als startpunt.",
    [
      {
        heading: "Story-first pipeline",
        paragraphs: [
          "Production brief → storyboard → scene images → voice → Motion → subtitles/translation → Publish.",
        ],
      },
      {
        heading: "Voor wie",
        paragraphs: [
          "Solo filmmakers, regisseurs, short-film makers en campagne-directors die AI-assistentie willen zonder clip-chaos.",
        ],
      },
    ],
    [
      {
        question: "Premiere vervangen?",
        answer: "Niet voor broadcast NLE werk. Wel voor storyboard-first producties: /alternatives/premiere-pro.",
      },
      {
        question: "Runway alternatief?",
        answer: "/alternatives/runway vergelijkt clip-platform met volledige suite.",
      },
      {
        question: "Word regisseur",
        answer: "/guides/word-je-eigen-regisseur.",
      },
      {
        question: "Eigen filmstudio",
        answer: "/guides/maak-je-eigen-filmstudio.",
      },
      {
        question: "Inspiratie grote studio's?",
        answer: "Plan als een grote studio, produceer als solo creator — zonder merk-affiliatie.",
      },
    ],
    [
      { href: "/guides/van-verhaal-naar-video", label: "Van verhaal naar video" },
      { href: "/guides/word-je-eigen-regisseur", label: "Word je eigen regisseur" },
      { href: "/guides/maak-je-eigen-filmstudio", label: "Eigen filmstudio" },
    ],
    [
      { href: "/alternatives/premiere-pro", label: "Premiere alternatief" },
      { href: "/alternatives/runway", label: "Runway alternatief" },
    ],
    [
      { href: "/studio", label: "Studio" },
      { href: "/publish", label: "Publish" },
      { href: "/projects", label: "Projects" },
    ],
    { href: "/studio/storyboards/new", label: "Nieuw storyboard" }
  ),

  writer: workflowHub(
    "writer",
    "Writer workflows",
    "Workflow voor auteurs: van boek en verhaal naar trailer, personages en visuele werelden in HomeCheff Studio.",
    "Writer workflows",
    "Workflow",
    "Auteurs verkopen verhalen — soms met woorden alleen, soms met een visuele pitch. HomeCheff Studio helpt je personages, werelden en sleutelscènes te tonen zonder een filmcrew.",
    [
      {
        heading: "Van manuscript naar beeld",
        paragraphs: [
          "Selecteer sleutelscènes, bouw characters, definieer worlds, render een trailer of pitch-reel.",
        ],
      },
      {
        heading: "Use cases",
        paragraphs: [
          "Boektrailers, fantasy world reveals, self-publishing promos, serial fiction teasers.",
        ],
      },
    ],
    [
      {
        question: "Boek naar film?",
        answer: "/guides/van-boek-naar-film.",
      },
      {
        question: "InVideo alternatief?",
        answer: "/alternatives/invideo voor template vs eigen verhaal.",
      },
      {
        question: "Personages",
        answer: "Maak characters in Studio die matchen met je boekbeschrijvingen.",
      },
      {
        question: "Fantasy wereld visualiseren?",
        answer: "Gebruik /guides/van-boek-naar-film voor werelden en personages uit je manuscript.",
      },
      {
        question: "Start",
        answer: "Storyboard met vijf scènes uit je boek.",
      },
    ],
    [
      { href: "/guides/van-boek-naar-film", label: "Van boek naar film" },
      { href: "/guides/van-verhaal-naar-video", label: "Van verhaal naar video" },
    ],
    [{ href: "/alternatives/invideo", label: "InVideo alternatief" }],
    [
      { href: "/studio/characters/new", label: "Characters" },
      { href: "/studio/worlds", label: "Worlds" },
    ],
    { href: "/studio/storyboards/new", label: "Storyboard je boek" }
  ),

  marketing: workflowHub(
    "marketing",
    "Marketing workflows",
    "Marketing workflow: productvideo's, social series en AI contentteam in HomeCheff Studio.",
    "Marketing workflows",
    "Workflow",
    "Marketeers hebben volume en consistentie nodig. HomeCheff Studio levert herbruikbare merkassets, campagne-storyboards, motion clips en meertalige varianten — één productielijn in plaats van vijf losse tools.",
    [
      {
        heading: "Campagne in Projects",
        paragraphs: [
          "Groepeer video's per campagne. Hergebruik hetzelfde merkpersonage of product-shot.",
        ],
      },
      {
        heading: "Kanalen",
        paragraphs: [
          "Export via Publish voor social, landing pages en ads. Ondertitels voor mute viewing; vertaling voor nieuwe markten.",
        ],
      },
    ],
    [
      {
        question: "Canva alternatief?",
        answer: "/alternatives/canva.",
      },
      {
        question: "CapCut alternatief?",
        answer: "/alternatives/capcut.",
      },
      {
        question: "Contentteam met AI",
        answer: "/guides/eigen-contentteam-met-ai.",
      },
      {
        question: "Productfoto naar video",
        answer: "Upload in Editor, animeer in Motion.",
      },
      {
        question: "Prijzen",
        answer: "/pricing.",
      },
    ],
    [{ href: "/guides/eigen-contentteam-met-ai", label: "Contentteam met AI" }],
    [
      { href: "/alternatives/canva", label: "Canva alternatief" },
      { href: "/alternatives/capcut", label: "CapCut alternatief" },
      { href: "/alternatives/invideo", label: "InVideo alternatief" },
    ],
    [
      { href: "/projects", label: "Projects" },
      { href: "/publish", label: "Publish" },
    ],
    { href: "/studio/storyboards/new", label: "Plan campagne" }
  ),

  education: workflowHub(
    "education",
    "Education workflows",
    "Onderwijs workflow: animatieschoolprojecten, uitlegvideo's en visueel leren met HomeCheff Studio.",
    "Education workflows",
    "Workflow",
    "Docenten en studenten maken uitleg en presentaties visueel aantrekkelijk. HomeCheff Studio structureert onderwerpen in scènes, voegt ondertitels toe voor toegankelijkheid, en exporteert voor klas of online leeromgeving.",
    [
      {
        heading: "Schoolprojecten",
        paragraphs: [
          "Kies een onderwerp, maak 5–8 scènes, voeg voice of ondertitels toe, presenteer in de klas.",
        ],
      },
      {
        heading: "Toegankelijkheid",
        paragraphs: [
          "Ondertitels helpen alle leerlingen; vertaling ondersteunt meertalige klassen.",
        ],
      },
    ],
    [
      {
        question: "Leeftijd",
        answer: "Geschikt met begeleiding voor jongere leerlingen.",
      },
      {
        question: "Wetenschap of geschiedenis?",
        answer: "Elk onderwerp dat baat heeft bij visual storytelling.",
      },
      {
        question: "Cartoon voor uitleg?",
        answer: "/guides/maak-je-eigen-cartoon kan een personage-based uitlegstijl starten.",
      },
      {
        question: "Credits voor scholen",
        answer: "Zie /pricing en help voor educatief gebruik.",
      },
      {
        question: "Start",
        answer: "Storyboard met je lesstructuur.",
      },
    ],
    [
      { href: "/guides/van-verhaal-naar-video", label: "Verhaal naar video" },
      { href: "/guides/maak-je-eigen-cartoon", label: "Cartoon uitleg" },
    ],
    [],
    [
      { href: "/studio/storyboards/new", label: "Storyboard" },
      { href: "/help", label: "Help Center" },
    ],
    { href: "/studio/storyboards/new", label: "Maak lesvideo" }
  ),

  gaming: workflowHub(
    "gaming",
    "Gaming & RPG workflows",
    "Gaming workflow: D&D werelden, game trailers, lore-video's en cutscenes in HomeCheff Studio.",
    "Gaming & RPG workflows",
    "Workflow",
    "Game developers en tabletop groepen vertellen werelden. HomeCheff Studio visualiseert lore, maakt trailers, en ondersteunt cutscene-storyboards met consistente characters en locations.",
    [
      {
        heading: "Indie dev",
        paragraphs: [
          "World bible → character art → trailer storyboard → Motion renders → store export.",
        ],
      },
      {
        heading: "Tabletop & RPG",
        paragraphs: [
          "Visualiseer campagne-momenten, maak recap-video's voor je groep, bouw locaties in Studio worlds.",
        ],
      },
    ],
    [
      {
        question: "Game trailer?",
        answer: "Plan 5–7 highlights in Studio; render in Motion.",
      },
      {
        question: "Runway/Pika alternatief?",
        answer: "/alternatives/runway en /alternatives/pika.",
      },
      {
        question: "Anime crossover",
        answer: "/guides/maak-je-eigen-anime.",
      },
      {
        question: "Lore video",
        answer: "Narratie + scene-beelden + Publish.",
      },
      {
        question: "Start",
        answer: "Definieer je wereld in Studio worlds.",
      },
    ],
    [
      { href: "/guides/maak-je-eigen-anime", label: "Anime project" },
      { href: "/guides/van-verhaal-naar-video", label: "Verhaal naar video" },
    ],
    [
      { href: "/alternatives/runway", label: "Runway alternatief" },
      { href: "/alternatives/pika", label: "Pika alternatief" },
    ],
    [
      { href: "/studio/worlds", label: "Worlds" },
      { href: "/studio/characters/new", label: "Characters" },
      { href: "/animate/instant", label: "Motion" },
    ],
    { href: "/studio/worlds", label: "Bouw je game wereld" }
  ),

  "creator-dreams": workflowHub(
    "creator-dreams",
    "Creator Dreams workflows",
    "Creator Dreams: cartoon, anime, serie, filmstudio en regisseur worden met HomeCheff Studio.",
    "Creator Dreams",
    "Workflow",
    "Creator Dreams is de aspiratie-laag: je eigen cartoon, anime, serie of filmstudio. HomeCheff Studio geeft je de productielijn — niet alleen een enkele AI-clip.",
    [
      {
        heading: "Populaire dromen",
        paragraphs: [
          "Cartoon maker, anime creator, animated series, eigen regisseur, digitale filmstudio.",
        ],
        bullets: [
          "Maak je eigen cartoon",
          "Maak je eigen animatieserie",
          "Word je eigen regisseur",
          "Breng tekeningen tot leven",
        ],
      },
      {
        heading: "Geen merk-verwarring",
        paragraphs: [
          "HomeCheff is niet gelieerd aan grote animatiestudio's of streamers. Je bouwt je eigen IP en workflow.",
        ],
      },
    ],
    [
      {
        question: "Waar begin ik?",
        answer: "Kies één gids hieronder en volg de Studio-CTA.",
      },
      {
        question: "Serie of eenmalig?",
        answer: "Serie: /guides/maak-je-eigen-animatieserie. Eenmalig: /guides/maak-je-eigen-cartoon.",
      },
      {
        question: "Tekeningen?",
        answer: "/guides/breng-je-tekeningen-tot-leven.",
      },
      {
        question: "Vergelijk tools",
        answer: "Bekijk /alternatives voor Canva, CapCut, Runway en meer.",
      },
      {
        question: "Gratis proberen",
        answer: "/signup.",
      },
    ],
    [
      { href: "/guides/maak-je-eigen-cartoon", label: "Eigen cartoon" },
      { href: "/guides/maak-je-eigen-animatieserie", label: "Animatieserie" },
      { href: "/guides/word-je-eigen-regisseur", label: "Eigen regisseur" },
      { href: "/guides/maak-je-eigen-filmstudio", label: "Eigen filmstudio" },
      { href: "/guides/breng-je-tekeningen-tot-leven", label: "Tekeningen tot leven" },
    ],
    [
      { href: "/alternatives/canva", label: "Canva alternatief" },
      { href: "/alternatives/runway", label: "Runway alternatief" },
    ],
    [
      { href: "/studio", label: "Studio" },
      { href: "/guides", label: "Alle gidsen" },
    ],
    { href: "/studio/storyboards/new", label: "Start je droomproject" }
  ),
};

export function getWorkflow(slug: string): WorkflowHub | null {
  if (!(slug in WORKFLOWS_CONTENT)) return null;
  return WORKFLOWS_CONTENT[slug as WorkflowSlug];
}

export const WORKFLOW_PATHS = WORKFLOW_SLUGS.map((s) => `/workflows/${s}` as const);
