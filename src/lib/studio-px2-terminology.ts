/**
 * PX.2 — canonical Studio terminology + CTA vocabulary.
 *
 * User-facing copy must follow this contract.
 * Internal ids, routes, APIs, and schema names stay unchanged.
 */

export const PX2_PRODUCT_BRAND = "HomeCheff Studio";

export type Px2Surface =
  | "normal"
  | "advanced"
  | "internal"
  | "seo"
  | "docs";

export type Px2Term = {
  id: string;
  internal: string;
  nl: string;
  en: string;
  surface: Px2Surface;
  notes: string;
};

/** One meaning per word for normal-user UI. */
export const PX2_GLOSSARY: readonly Px2Term[] = [
  {
    id: "home",
    internal: "Universe",
    nl: "Home",
    en: "Home",
    surface: "normal",
    notes: "Never expose Universe as a product the user must learn.",
  },
  {
    id: "brand",
    internal: "HomeCheff Studio",
    nl: "HomeCheff Studio",
    en: "HomeCheff Studio",
    surface: "normal",
    notes: "Overall product brand only — not a sub-module name.",
  },
  {
    id: "studioHome",
    internal: "Motion Studio dashboard",
    nl: "Jouw studio",
    en: "Your studio",
    surface: "normal",
    notes: "Authenticated /studio dashboard title.",
  },
  {
    id: "images",
    internal: "Editor",
    nl: "Beelden",
    en: "Images",
    surface: "normal",
    notes: "Outcome label for /editor. Route stays /editor.",
  },
  {
    id: "stories",
    internal: "Studio hub / storyboard",
    nl: "Verhalen",
    en: "Stories",
    surface: "normal",
    notes: "Outcome label for /studio hub. Brand remains HomeCheff Studio.",
  },
  {
    id: "story",
    internal: "storyboard / videoverhaal",
    nl: "Verhaal",
    en: "Story",
    surface: "normal",
    notes: "Storyboard remains advanced/internal.",
  },
  {
    id: "animation",
    internal: "Motion / Animate / Instant",
    nl: "Animatie",
    en: "Animation",
    surface: "normal",
    notes: "Converge Motion/Animate/Instant labels. Routes unchanged.",
  },
  {
    id: "finishVideo",
    internal: "Publish",
    nl: "Video afronden",
    en: "Finish video",
    surface: "normal",
    notes: "Task label for /publish. Route stays /publish.",
  },
  {
    id: "help",
    internal: "Copilot / Assistant",
    nl: "Hulp",
    en: "Help",
    surface: "normal",
    notes: "Default assistance chrome. Copilot engine stays.",
  },
  {
    id: "suggestions",
    internal: "Director / AI-regisseur",
    nl: "Suggesties",
    en: "Suggestions",
    surface: "normal",
    notes: "Default Director V2 chrome. Director remains in Advanced.",
  },
  {
    id: "objects",
    internal: "Props",
    nl: "Objecten",
    en: "Objects",
    surface: "normal",
    notes: "Reusable scene objects.",
  },
  {
    id: "styleWorld",
    internal: "World",
    nl: "Stijlwereld",
    en: "Style world",
    surface: "normal",
    notes: "Shared visual continuity profile.",
  },
  {
    id: "files",
    internal: "Assets",
    nl: "Bestanden",
    en: "Files",
    surface: "normal",
    notes: "Library items. Use Onderdeel only when referring to a scene piece.",
  },
  {
    id: "traits",
    internal: "Memory",
    nl: "Kenmerken",
    en: "Traits",
    surface: "normal",
    notes: "Remembered identity/continuity fields — not chat memory.",
  },
  {
    id: "sameLook",
    internal: "Consistency",
    nl: "Zelfde stijl",
    en: "Same look",
    surface: "normal",
    notes: "Avoid Doorlopendheid — unclear to normal users.",
  },
  {
    id: "makeVideo",
    internal: "Orchestrator",
    nl: "Video maken",
    en: "Make video",
    surface: "normal",
    notes: "Never expose orchestrator.",
  },
  {
    id: "continueTo",
    internal: "Handoff",
    nl: "Doorgaan naar",
    en: "Continue to",
    surface: "normal",
    notes: "Module transfer without engineering jargon.",
  },
  {
    id: "credits",
    internal: "Credits",
    nl: "Credits",
    en: "Credits",
    surface: "normal",
    notes: "Keep unit name; surrounding copy must explain cost.",
  },
  {
    id: "directorAdvanced",
    internal: "Director",
    nl: "Director",
    en: "Director",
    surface: "advanced",
    notes: "Expert mode / advanced tools only.",
  },
  {
    id: "frameflow",
    internal: "FrameFlow",
    nl: "FrameFlow",
    en: "FrameFlow",
    surface: "internal",
    notes: "Package/docs only — never user-facing.",
  },
] as const;

export type Px2CtaId =
  | "chooseIntent"
  | "getStarted"
  | "continue"
  | "newStory"
  | "makeVideo"
  | "editImages"
  | "startAnimation"
  | "finishVideo"
  | "openLibrary"
  | "viewPlans";

export type Px2Cta = {
  id: Px2CtaId;
  nl: string;
  en: string;
  meaning: string;
  /** Canonical destination when this CTA is used as a primary start. */
  destination?: string;
};

/**
 * Law 12: the same start verb must not lead to unrelated concepts.
 * Labels describe the destination. Destinations are not remapped in PX.2.
 */
export const PX2_CTA_VOCABULARY: readonly Px2Cta[] = [
  {
    id: "chooseIntent",
    nl: "Wat wil je maken?",
    en: "What do you want to make?",
    meaning: "Open the guided intent chooser.",
    destination: "/studio/experience",
  },
  {
    id: "getStarted",
    nl: "Aan de slag",
    en: "Get started",
    meaning: "Generic begin — only when destination is the intent chooser or login.",
  },
  {
    id: "continue",
    nl: "Ga verder",
    en: "Continue",
    meaning: "Resume existing work.",
  },
  {
    id: "newStory",
    nl: "Nieuw verhaal",
    en: "New story",
    meaning: "Create a story/workspace project.",
    destination: "/studio/storyboards/new",
  },
  {
    id: "makeVideo",
    nl: "Video maken",
    en: "Make video",
    meaning: "Guided video production.",
  },
  {
    id: "editImages",
    nl: "Beelden bewerken",
    en: "Edit images",
    meaning: "Open image editing.",
    destination: "/editor",
  },
  {
    id: "startAnimation",
    nl: "Animatie starten",
    en: "Start animation",
    meaning: "Open photo-to-video / motion start.",
    destination: "/motion/start",
  },
  {
    id: "finishVideo",
    nl: "Video afronden",
    en: "Finish video",
    meaning: "Open finish/export.",
    destination: "/publish/start",
  },
  {
    id: "openLibrary",
    nl: "Bibliotheek openen",
    en: "Open library",
    meaning: "Open saved files.",
    destination: "/library",
  },
  {
    id: "viewPlans",
    nl: "Bekijk abonnementen",
    en: "View plans",
    meaning: "Pricing — never a creation start.",
    destination: "/pricing",
  },
] as const;

export const PX2_PRESERVED_ROUTES = [
  "/",
  "/maak",
  "/studio",
  "/studio/start",
  "/studio/experience",
  "/studio/storyboards/new",
  "/editor",
  "/editor/start",
  "/motion",
  "/motion/start",
  "/animate/instant",
  "/publish",
  "/publish/start",
  "/library",
  "/projects",
  "/videos",
  "/account",
  "/account/credits",
  "/auth/sso/silent",
] as const;

export function px2Term(id: (typeof PX2_GLOSSARY)[number]["id"]): Px2Term {
  const term = PX2_GLOSSARY.find((entry) => entry.id === id);
  if (!term) {
    throw new Error(`Unknown PX.2 term: ${id}`);
  }
  return term;
}

export function px2Cta(id: Px2CtaId): Px2Cta {
  const cta = PX2_CTA_VOCABULARY.find((entry) => entry.id === id);
  if (!cta) {
    throw new Error(`Unknown PX.2 CTA: ${id}`);
  }
  return cta;
}
