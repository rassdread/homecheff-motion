import type { SeoContentPage } from "@/lib/seo/seo-content-types";

function guideBase(
  slug: string,
  title: string,
  metaDescription: string,
  h1: string,
  eyebrow: string,
  intro: string,
  sections: SeoContentPage["sections"],
  faqs: SeoContentPage["faqs"],
  internalLinks: SeoContentPage["internalLinks"],
  studioCta: SeoContentPage["studioCta"]
): SeoContentPage {
  return {
    slug,
    path: `/guides/${slug}`,
    title,
    metaDescription,
    h1,
    eyebrow,
    intro,
    sections,
    faqs,
    internalLinks,
    studioCta,
    locale: "nl",
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/guides", label: "Gidsen" },
      { href: `/guides/${slug}`, label: h1 },
    ],
  };
}

export const GUIDE_SLUGS = [
  "breng-je-tekeningen-tot-leven",
  "van-schets-naar-animatie",
  "van-verhaal-naar-video",
  "van-boek-naar-film",
  "maak-je-eigen-cartoon",
  "maak-je-eigen-anime",
  "maak-je-eigen-manga",
  "maak-je-eigen-filmstudio",
  "word-je-eigen-regisseur",
  "maak-je-eigen-animatieserie",
  "eigen-contentteam-met-ai",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export const GUIDES_CONTENT: Record<GuideSlug, SeoContentPage> = {
  "breng-je-tekeningen-tot-leven": guideBase(
    "breng-je-tekeningen-tot-leven",
    "Breng je tekeningen tot leven",
    "Zet kindertekeningen en eigen artwork om in bewegende scènes met HomeCheff Studio — van upload tot animatie en publicatie.",
    "Breng je tekeningen tot leven",
    "Creator Dreams",
    "Of het nu een kindertekening op de koelkast is of een digitaal personage: met HomeCheff Studio maak je er een echte scène van. Je uploadt in Editor, plant het verhaal in Studio, en Motion zet je beelden om in video — met stem, ondertitels en export wanneer je klaar bent.",
    [
      {
        heading: "Stap 1 — Upload en verfijn in Editor",
        paragraphs: [
          "Scan of upload je tekening als PNG of JPG. In Editor kun je achtergronden verwijderen, elementen combineren en je tekening klaarmaken als scene-asset. Alles komt in je Library terecht voor hergebruik.",
        ],
      },
      {
        heading: "Stap 2 — Bouw een mini-verhaal in Studio",
        paragraphs: [
          "Eén tekening wordt krachtiger met context. Maak een kort storyboard: drie tot vijf scènes waarin je personage iets doet. Studio helpt je scene-beelden consistent te houden.",
        ],
      },
      {
        heading: "Stap 3 — Animeer in Motion",
        paragraphs: [
          "Kies een scene-afbeelding en open Motion. Image-to-video geeft beweging aan je tekening — ideaal voor een verjaardagsclip, een cadeau voor familie, of je eerste cartoon.",
        ],
      },
    ],
    [
      {
        question: "Moet mijn tekening digitaal zijn?",
        answer: "Nee. Een foto van papier werkt. Zorg voor goed licht en een vlakke achtergrond voor het beste resultaat.",
      },
      {
        question: "Is dit geschikt voor kinderen?",
        answer: "Ja, met ouderlijk toezicht. Maak samen een verhaal en deel de video veilig met familie.",
      },
      {
        question: "Hoeveel kost het?",
        answer: "Bekijk actuele creditkosten op /pricing. Je kunt klein beginnen met één scene.",
      },
      {
        question: "Kan ik een stem toevoegen?",
        answer: "Ja. Wijs een voice toe aan je personage in Studio en exporteer met ondertitels.",
      },
      {
        question: "Wat als ik nog geen verhaal heb?",
        answer: "Begin met één scène in Motion. Voeg later scènes toe in Studio voor een langere clip.",
      },
    ],
    [
      { href: "/editor/start", label: "Editor starten" },
      { href: "/workflows/artist", label: "Artist workflow" },
      { href: "/alternatives/photoshop", label: "Photoshop alternatief" },
      { href: "/guides/van-schets-naar-animatie", label: "Van schets naar animatie" },
    ],
    { href: "/editor/start", label: "Upload je tekening" }
  ),

  "van-schets-naar-animatie": guideBase(
    "van-schets-naar-animatie",
    "Van schets naar animatie",
    "Van ruwe schets naar bewegende animatie in HomeCheff Studio — Editor, storyboard en Motion in één workflow.",
    "Van schets naar animatie",
    "Artist workflow",
    "Een schets is het begin, geen eindpunt. In HomeCheff Studio werk je van ruwe lijnen naar scene-beelden en vandaar naar korte animatieclips — zonder animatieschool of zware montagesoftware.",
    [
      {
        heading: "Schets voorbereiden",
        paragraphs: [
          "Houd contrast hoog en vermijd wazige foto's. In Editor kun je de schets opschonen, combineren met referenties en als basis voor een scene-image gebruiken.",
        ],
      },
      {
        heading: "Van schets naar scene-beeld",
        paragraphs: [
          "Studio genereert scene-afbeeldingen die je schets respecteren maar geschikt zijn voor video. Zo behoud je je stijl terwijl je compositie en belichting verbeteren.",
        ],
      },
      {
        heading: "Beweging toevoegen",
        paragraphs: [
          "Motion animeert je scene-beeld. Voor een langere animatie maak je meerdere scènes en laat je ze aansluiten via je project.",
        ],
      },
    ],
    [
      {
        question: "Heb ik tekenervaring nodig?",
        answer: "Basis schetsen is genoeg. De workflow helpt je van lijn naar beweging.",
      },
      {
        question: "Kan ik meerdere schetsen combineren?",
        answer: "Ja. Upload meerdere schetsen en bouw een storyboard met één personage of wereld.",
      },
      {
        question: "Werkt dit voor manga-stijl?",
        answer: "Ja. Zie ook /guides/maak-je-eigen-manga voor een series-aanpak.",
      },
      {
        question: "Exportformaat?",
        answer: "Exporteer via Publish naar gangbare videoformaten voor social of presentatie.",
      },
      {
        question: "Alternatief voor After Effects?",
        answer: "Voor scene-animatie zonder keyframes: /alternatives/after-effects.",
      },
    ],
    [
      { href: "/workflows/artist", label: "Artist workflow" },
      { href: "/alternatives/after-effects", label: "After Effects alternatief" },
      { href: "/guides/breng-je-tekeningen-tot-leven", label: "Tekeningen tot leven" },
    ],
    { href: "/editor/start", label: "Begin met je schets" }
  ),

  "van-verhaal-naar-video": guideBase(
    "van-verhaal-naar-video",
    "Van verhaal naar video",
    "Zet je verhaal om in video met storyboards, scènes, stem en export in HomeCheff Studio.",
    "Van verhaal naar video",
    "Filmmaker workflow",
    "Je hebt een verhaal — een idee, een script of een hoofdstuk. HomeCheff Studio helpt je het te structureren in scènes, personages en werelden, en vandaar naar video met stem, ondertitels en publicatie.",
    [
      {
        heading: "Structuur: acts en scènes",
        paragraphs: [
          "Begin met een production brief in Studio: wie is de held, wat verandert er, welke scènes zijn nodig? Denk in beats, niet in losse prompts.",
        ],
      },
      {
        heading: "Visuele consistentie",
        paragraphs: [
          "Leg personages en werelden vast in Library. Zo ziet je held er in scène 5 hetzelfde uit als in scène 1.",
        ],
      },
      {
        heading: "Van plan naar render",
        paragraphs: [
          "Genereer scene-beelden, stuur ze naar Motion, voeg voice en ondertitels toe, en publiceer versies voor verschillende kanalen of talen.",
        ],
      },
    ],
    [
      {
        question: "Moet mijn verhaal af zijn?",
        answer: "Een outline is genoeg om te starten. Het storyboard groeit mee.",
      },
      {
        question: "Kan ik samenwerken?",
        answer: "Gebruik Projects om assets en voortgang te bundelen.",
      },
      {
        question: "AI Director — wat is dat?",
        answer: "Studio helpt scènes plannen en verbeteren voordat je rendert.",
      },
      {
        question: "Meertalige video?",
        answer: "Ja. Maak vertalingen en ondertitels als versies van hetzelfde project.",
      },
      {
        question: "Ik wil regisseur worden",
        answer: "Lees /guides/word-je-eigen-regisseur voor dezelfde workflow met regie-focus.",
      },
    ],
    [
      { href: "/workflows/filmmaker", label: "Filmmaker workflow" },
      { href: "/workflows/writer", label: "Writer workflow" },
      { href: "/alternatives/premiere-pro", label: "Premiere alternatief" },
      { href: "/guides/word-je-eigen-regisseur", label: "Word je eigen regisseur" },
    ],
    { href: "/studio/storyboards/new", label: "Maak je storyboard" }
  ),

  "van-boek-naar-film": guideBase(
    "van-boek-naar-film",
    "Van boek naar film",
    "Van manuscript naar visuele film of trailer met personages, werelden en scènes in HomeCheff Studio.",
    "Van boek naar film",
    "Writer workflow",
    "Auteurs gebruiken HomeCheff Studio om lezers te laten zien hoe hun wereld eruitziet — van boektrailer tot volledige scene-visualisatie. Je hoeft geen filmcrew te zijn; je hebt een storyboard-gedreven studio nodig.",
    [
      {
        heading: "Kies je scènes slim",
        paragraphs: [
          "Een boek bevat te veel voor één video. Kies drie tot zeven sleutelmomenten die de toon en protagonist tonen — ideaal voor een trailer of pitch.",
        ],
      },
      {
        heading: "Personages uit je boek",
        paragraphs: [
          "Maak character profiles die passen bij je beschrijvingen. Upload referenties of laat Studio helpen met consistente scene-beelden.",
        ],
      },
      {
        heading: "Wereld en sfeer",
        paragraphs: [
          "Worlds en locations in Studio houden je fantasy- of literaire wereld visueel coherent.",
        ],
      },
    ],
    [
      {
        question: "Is dit een volledige boekverfilming?",
        answer: "Het is visuele adaptatie en trailers — geen vervanging van een Hollywood-productie.",
      },
      {
        question: "Pitch voor uitgevers?",
        answer: "Ja. Storyboards en korte clips werken sterk in pitch decks.",
      },
      {
        question: "Hoe lang duurt een boektrailer?",
        answer: "Vaak 30–90 seconden. Plan vijf scènes in Studio.",
      },
      {
        question: "Audioboek-stem?",
        answer: "Wijs voices toe aan personages of gebruik narratie in Studio.",
      },
      {
        question: "Meer over trailers",
        answer: "Combineer met marketing-workflows op /workflows/marketing.",
      },
    ],
    [
      { href: "/workflows/writer", label: "Writer workflow" },
      { href: "/guides/van-verhaal-naar-video", label: "Van verhaal naar video" },
      { href: "/alternatives/invideo", label: "InVideo alternatief" },
    ],
    { href: "/studio/storyboards/new", label: "Start je boek-storyboard" }
  ),

  "maak-je-eigen-cartoon": guideBase(
    "maak-je-eigen-cartoon",
    "Maak je eigen cartoon",
    "Maak je eigen cartoon met consistente personages, scènes en animatie in HomeCheff Studio.",
    "Maak je eigen cartoon",
    "Creator Dreams",
    "Je eigen cartoon begint met een personage dat je blijft herkennen. HomeCheff Studio combineert character design, storyboards, voice en Motion zodat je niet elke aflevering opnieuw begint.",
    [
      {
        heading: "Ontwerp je held",
        paragraphs: [
          "Maak een character in Studio met identity profile. Sla varianten op in Library voor later.",
        ],
      },
      {
        heading: "Schrijf korte afleveringen",
        paragraphs: [
          "Cartoons werken in 30 seconden tot drie minuten. Plan scènes met een duidelijk begin, grap of emotie, en einde.",
        ],
      },
      {
        heading: "Animeer en publiceer",
        paragraphs: [
          "Motion maakt clips van je scene-beelden. Publish exporteert voor YouTube, social of schoolprojecten.",
        ],
      },
    ],
    [
      {
        question: "Voor kinderen of volwassenen?",
        answer: "Beide. De workflow is hetzelfde; de content bepaal jij.",
      },
      {
        question: "Tekenen kan ik niet goed",
        answer: "Upload een simpele schets of gebruik Editor om een basis te maken.",
      },
      {
        question: "Serie maken?",
        answer: "Ja — zie /guides/maak-je-eigen-animatieserie.",
      },
      {
        question: "Canva alternatief?",
        answer: "/alternatives/canva vergelijkt template-tools met een echte cartoon-pipeline.",
      },
      {
        question: "Kosten",
        answer: "Transparante credits op /pricing.",
      },
    ],
    [
      { href: "/workflows/creator-dreams", label: "Creator Dreams" },
      { href: "/guides/maak-je-eigen-animatieserie", label: "Animatieserie" },
      { href: "/alternatives/canva", label: "Canva alternatief" },
    ],
    { href: "/studio/characters/new", label: "Maak je cartoon-personage" }
  ),

  "maak-je-eigen-anime": guideBase(
    "maak-je-eigen-anime",
    "Maak je eigen anime",
    "Bouw je eigen anime-project met werelden, personages en scene-animatie in HomeCheff Studio.",
    "Maak je eigen anime",
    "Creator Dreams",
    "Anime-fans willen meer dan één clip — ze willen een wereld met herkenbare helden. HomeCheff Studio ondersteunt worldbuilding, character bibles en scene-animatie in één productielijn.",
    [
      {
        heading: "World bible",
        paragraphs: [
          "Definieer je wereld, locaties en visuele regels in Studio. Consistentie is wat een project 'anime' laat voelen in plaats van losse plaatjes.",
        ],
      },
      {
        heading: "Personages met gezichten die blijven",
        paragraphs: [
          "Character identity zorgt dat je protagonist dezelfde blijft over scènes heen — cruciaal voor korte films en series.",
        ],
      },
      {
        heading: "Scene-animatie",
        paragraphs: [
          "Motion zet scene-beelden om in beweging. Combineer met voice en ondertitels voor dialogescènes.",
        ],
      },
    ],
    [
      {
        question: "Kopieer ik bestaande anime?",
        answer: "Nee. Bouw originele personages en werelden. Geen IP van studio's of series.",
      },
      {
        question: "Manga en anime samen?",
        answer: "Zie /guides/maak-je-eigen-manga voor panel-naar-scène workflows.",
      },
      {
        question: "Runway of Pika alternatief?",
        answer: "/alternatives/runway en /alternatives/pika vergelijken clip-tools met een serie-studio.",
      },
      {
        question: "Gaming crossover?",
        answer: "/workflows/gaming voor trailers en lore-video's.",
      },
      {
        question: "Waar begin ik?",
        answer: "Met een storyboard van je openingscène.",
      },
    ],
    [
      { href: "/workflows/gaming", label: "Gaming workflow" },
      { href: "/guides/maak-je-eigen-manga", label: "Manga gids" },
      { href: "/alternatives/runway", label: "Runway alternatief" },
    ],
    { href: "/studio/storyboards/new", label: "Start je anime-project" }
  ),

  "maak-je-eigen-manga": guideBase(
    "maak-je-eigen-manga",
    "Maak je eigen manga",
    "Van manga-panelen naar geanimeerde scènes met behoud van stijl in HomeCheff Studio.",
    "Maak je eigen manga",
    "Artist workflow",
    "Manga-dromen gaan over stijl en verhaal. Upload panels of schetsen, bouw scènes in Studio, en animeer selecte momenten in Motion — zonder bestaande series of merken te kopiëren.",
    [
      {
        heading: "Panels als referentie",
        paragraphs: [
          "Editor accepteert je panel-uploads. Gebruik ze als reference role voor scene-beelden die jouw lijnvoering volgen.",
        ],
      },
      {
        heading: "Verhaallijn boven losse plaat",
        paragraphs: [
          "Koppel panels aan een storyboard met duidelijke volgorde. Lezers (en kijkers) willen een arc, niet alleen mooie stills.",
        ],
      },
      {
        heading: "Selectieve animatie",
        paragraphs: [
          "Niet elk panel hoeft video te worden. Kies hoogtepunten — actie, reveal, emotie — voor Motion.",
        ],
      },
    ],
    [
      {
        question: "Is dit officiële manga-productie?",
        answer: "Het is een creator-workflow voor originele werk. Geen uitgever of licentie impliciet.",
      },
      {
        question: "Zwarte-wit stijl?",
        answer: "Upload hoge contrast panels voor beste scene-generatie.",
      },
      {
        question: "Naar anime-serie?",
        answer: "Combineer met /guides/maak-je-eigen-anime.",
      },
      {
        question: "Photoshop nodig?",
        answer: "Niet per se. /alternatives/photoshop legt het verschil uit.",
      },
      {
        question: "Ondertitels",
        answer: "Dialogue-scènes werken goed met automatische ondertitels en vertaling.",
      },
    ],
    [
      { href: "/guides/maak-je-eigen-anime", label: "Anime gids" },
      { href: "/workflows/artist", label: "Artist workflow" },
      { href: "/editor/start", label: "Editor" },
    ],
    { href: "/editor/start", label: "Importeer je panels" }
  ),

  "maak-je-eigen-filmstudio": guideBase(
    "maak-je-eigen-filmstudio",
    "Maak je eigen filmstudio",
    "Richt je eigen digitale filmstudio in met Editor, Studio, Motion, Library en Projects.",
    "Maak je eigen filmstudio",
    "Creator Dreams",
    "Een filmstudio is geen gebouw — het is een pipeline. HomeCheff Studio geeft je Editor voor assets, Studio voor verhaal en scènes, Motion voor video, Library voor consistentie, en Projects als dashboard.",
    [
      {
        heading: "Je asset-bank: Library",
        paragraphs: [
          "Alles wat je maakt of uploadt leeft in Library. Personages, werelden en referenties zijn herbruikbaar voor elke nieuwe productie.",
        ],
      },
      {
        heading: "Je regie-hub: Studio",
        paragraphs: [
          "Storyboards, production briefs, director tools en scene planning — dit is waar beslissingen vallen voordat je rendert.",
        ],
      },
      {
        heading: "Je output: Motion en Publish",
        paragraphs: [
          "Motion genereert clips; Publish beheert versies, formaten en meertalige exports.",
        ],
      },
    ],
    [
      {
        question: "Vervangt dit een echte studio?",
        answer: "Het vervangt een fysieke studio niet — het geeft solo creators en kleine teams een professionele workflow.",
      },
      {
        question: "Teamleden?",
        answer: "Projects organiseren werk; rollen groeien met je account-behoeften.",
      },
      {
        question: "Inspiratie grote studio's?",
        answer: "Plan eerst, animeer later — de discipline van grote animatiestudio's, zonder affiliatie of merkclaims.",
      },
      {
        question: "Kostenbeheer?",
        answer: "Credits per actie op /pricing — geen verborgen abonnementen verplicht.",
      },
      {
        question: "Eerste stap",
        answer: "Open Studio en maak je eerste storyboard.",
      },
    ],
    [
      { href: "/studio", label: "Studio openen" },
      { href: "/library", label: "Library" },
      { href: "/projects", label: "Projects" },
      { href: "/guides/word-je-eigen-regisseur", label: "Word regisseur" },
    ],
    { href: "/studio", label: "Open je studio" }
  ),

  "word-je-eigen-regisseur": guideBase(
    "word-je-eigen-regisseur",
    "Word je eigen regisseur",
    "Leid je eigen productie met AI Director, storyboards en scene planning in HomeCheff Studio.",
    "Word je eigen regisseur",
    "Filmmaker workflow",
    "Een regisseur neemt beslissingen: wat zie je, in welke volgorde, met welke emotie? HomeCheff Studio laat jou die keuzes maken terwijl AI uitvoering ondersteunt — scene-beelden, voice, montage en export.",
    [
      {
        heading: "Regie begint met storyboard",
        paragraphs: [
          "Elke scène is een beslissing. Storyboards zijn je draaiboek; Studio is je verzamelpunt voor feedback en verbetering.",
        ],
      },
      {
        heading: "AI Director als assistent",
        paragraphs: [
          "Gebruik director tools om scènes te verbeteren, consistentie te checken en motion-instructies voor te bereiden — jij blijft de eindbeslisser.",
        ],
      },
      {
        heading: "Van set naar screen",
        paragraphs: [
          "Motion rendert je visie. Publish levert de versie die past bij je kanaal of publiek.",
        ],
      },
    ],
    [
      {
        question: "Heb ik ervaring nodig?",
        answer: "Nee. Begin met een kort verhaal en vijf scènes.",
      },
      {
        question: "Documentaire of fictie?",
        answer: "Beide structuren werken; fictie en explainers zijn het meest gebruikt.",
      },
      {
        question: "Premiere leren?",
        answer: "Niet verplicht voor storyboard-first werk. Zie /alternatives/premiere-pro.",
      },
      {
        question: "Filmmaker worden",
        answer: "Zie /guides/van-verhaal-naar-video voor dezelfde lijn met schrijffocus.",
      },
      {
        question: "Eigen filmstudio",
        answer: "/guides/maak-je-eigen-filmstudio voor de volledige suite-uitleg.",
      },
    ],
    [
      { href: "/workflows/filmmaker", label: "Filmmaker workflow" },
      { href: "/guides/maak-je-eigen-filmstudio", label: "Eigen filmstudio" },
      { href: "/alternatives/premiere-pro", label: "Premiere alternatief" },
    ],
    { href: "/studio/storyboards/new", label: "Regisseer je eerste scène" }
  ),

  "maak-je-eigen-animatieserie": guideBase(
    "maak-je-eigen-animatieserie",
    "Maak je eigen animatieserie",
    "Produceer een animatieserie met herbruikbare personages, Projects en Library in HomeCheff Studio.",
    "Maak je eigen animatieserie",
    "Creator Dreams",
    "Een serie wint wanneer aflevering 10 dezelfde held toont als aflevering 1. HomeCheff Studio is gebouwd voor episodisch werk: character bibles, Library consistency, en Projects per seizoen.",
    [
      {
        heading: "Bible en cast",
        paragraphs: [
          "Documenteer personages, werelden en regels voordat je aflevering 2 maakt. Studio characters en worlds zijn je bible.",
        ],
      },
      {
        heading: "Project per seizoen",
        paragraphs: [
          "Gebruik Projects om afleveringen te groeperen. Hergebruik assets; rendert alleen nieuwe scènes.",
        ],
      },
      {
        heading: "Publicatiecadans",
        paragraphs: [
          "Publish versies per aflevering. Plan thumbnails, ondertitels en vertalingen vanaf het begin.",
        ],
      },
    ],
    [
      {
        question: "Hoe lang per aflevering?",
        answer: "Begin met 30–90 seconden tot je pipeline staat.",
      },
      {
        question: "Cartoon of anime?",
        answer: "Zelfde workflow; zie /guides/maak-je-eigen-cartoon en /guides/maak-je-eigen-anime.",
      },
      {
        question: "Pika alternatief?",
        answer: "/alternatives/pika voor clip vs serie.",
      },
      {
        question: "Team?",
        answer: "Library en Projects helpen samenwerken aan dezelfde assets.",
      },
      {
        question: "Eerste aflevering",
        answer: "Maak een pilot-storyboard met vijf scènes.",
      },
    ],
    [
      { href: "/projects", label: "Projects" },
      { href: "/guides/maak-je-eigen-cartoon", label: "Cartoon" },
      { href: "/alternatives/pika", label: "Pika alternatief" },
    ],
    { href: "/projects", label: "Start je serie-project" }
  ),

  "eigen-contentteam-met-ai": guideBase(
    "eigen-contentteam-met-ai",
    "Maak je eigen contentteam met AI",
    "Vervang een verspreid marketingteam door één AI-productielijn: verhaal, video, stem en publicatie in HomeCheff Studio.",
    "Maak je eigen contentteam met AI",
    "Marketing workflow",
    "Als solopreneur of klein bedrijf ben jij strategie, regie én uitvoering. HomeCheff Studio verdeelt het werk: jij beslist het verhaal; AI helpt met assets, scènes, voice, ondertitels en varianten.",
    [
      {
        heading: "Rollen in één suite",
        paragraphs: [
          "Editor = art department. Studio = regie en planning. Motion = camera en animatie. Publish = delivery. Library = brand assets.",
        ],
      },
      {
        heading: "Campagnes i.p.v. losse posts",
        paragraphs: [
          "Plan een reeks video's in één Project. Hergebruik hetzelfde merkpersonage voor herkenning.",
        ],
      },
      {
        heading: "Meertalig bereik",
        paragraphs: [
          "Vertaal en ondertitel varianten voor verschillende markten zonder opnieuw te monteren.",
        ],
      },
    ],
    [
      {
        question: "Vervangt dit mijn bureau?",
        answer: "Het vervangt geen strategiebureau — het versnelt productie wanneer jij de richting bepaalt.",
      },
      {
        question: "Productvideo's?",
        answer: "Ja. Upload productfoto's in Editor en Motion voor korte clips.",
      },
      {
        question: "Canva of CapCut?",
        answer: "Vergelijk /alternatives/canva en /alternatives/capcut.",
      },
      {
        question: "InVideo alternatief?",
        answer: "/alternatives/invideo voor template vs custom story.",
      },
      {
        question: "Prijzen voor teams",
        answer: "Bekijk abonnementen en credits op /pricing.",
      },
    ],
    [
      { href: "/workflows/marketing", label: "Marketing workflow" },
      { href: "/alternatives/canva", label: "Canva alternatief" },
      { href: "/alternatives/invideo", label: "InVideo alternatief" },
      { href: "/alternatives/capcut", label: "CapCut alternatief" },
    ],
    { href: "/studio/storyboards/new", label: "Plan je campagne" }
  ),
};

export function getGuide(slug: string): SeoContentPage | null {
  if (!(slug in GUIDES_CONTENT)) return null;
  return GUIDES_CONTENT[slug as GuideSlug];
}

export const GUIDE_PATHS = GUIDE_SLUGS.map((s) => `/guides/${s}` as const);
