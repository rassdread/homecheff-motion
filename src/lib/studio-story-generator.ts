import type { StudioStoryAssetRequirement } from "@/types/studio-story-generator";

export type StudioGeneratedStoryline = {
  title: string;
  logline: string;
  summary: string;
  targetAudience: string;
  tone: string;
  musicMood: string;
  soundEnvironment: string;
  cta: string;
  scenes: Array<{
    id: string;
    title: string;
    script: string;
    visualDescription: string;
    voiceOver: string;
    subtitle: string;
  }>;
  assetRequirements: StudioStoryAssetRequirement[];
};

export type StudioStoryRewriteMode =
  | "regenerate"
  | "shorter"
  | "commercial"
  | "emotional"
  | "cinematic";

function slugScene(index: number): string {
  return `scene_${index + 1}`;
}

export function buildStudioStorylineFromIdea(
  idea: string,
  context?: {
    emotions?: string[];
    visualStyles?: string[];
    audience?: string[];
    locale?: string;
  }
): StudioGeneratedStoryline {
  const locale = context?.locale?.toLowerCase().startsWith("nl") ? "nl" : "en";
  const trimmed = idea.trim() || (locale === "nl" ? "Een dag in de keuken" : "A day in the kitchen");
  const title = trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed;
  const style = context?.visualStyles?.[0] ?? (locale === "nl" ? "cinematisch" : "cinematic");
  const emotion = context?.emotions?.[0] ?? (locale === "nl" ? "energie" : "excitement");
  const audience = context?.audience?.[0] ?? (locale === "nl" ? "algemeen" : "general");

  if (locale === "nl") {
    return {
      title,
      logline: `Een ${style} verhaal gedreven door ${emotion} — meer dan alleen een wandeling.`,
      summary: `Dit project vertolkt de kern van je idee voor ${audience} publiek, met scènes die bouwen naar een gedeelde pay-off.`,
      targetAudience: audience,
      tone: `${emotion}, ${style}, toegankelijk`,
      musicMood: "Lichte upbeat akoestisch",
      soundEnvironment: "Stads- of keukenambience",
      cta: "Probeer het zelf — start in HomeCheff Studio.",
      scenes: [
        {
          id: slugScene(0),
          title: "Opening",
          script: "We openen op het thema van je idee — niet letterlijk je zin.",
          visualDescription: "Hero-shot met natuurlijk licht en heldere compositie.",
          voiceOver: "Soms begint een community met één stap.",
          subtitle: trimmed,
        },
        {
          id: slugScene(1),
          title: "Middendeel",
          script: "De sleutelmomenten met ritme en helderheid.",
          visualDescription: "Medium shots van personages, plekken en transformatie.",
          voiceOver: "Elke ontmoeting voegt iets toe.",
          subtitle: "Stap voor stap",
        },
        {
          id: slugScene(2),
          title: "Pay-off",
          script: "Onthul het resultaat en nodig uit tot actie.",
          visualDescription: "Hero reveal met ruimte voor merk.",
          voiceOver: "Jouw versie is klaar om te delen.",
          subtitle: "Klaar om te publiceren",
        },
      ],
      assetRequirements: [
        { kind: "character", label: "Host of mascotte", required: false },
        { kind: "location", label: "Hoofdlocatie", required: true },
        { kind: "prop", label: "Hero product of ingredient", required: true },
        { kind: "world", label: "Merk look & feel", required: false },
      ],
    };
  }

  return {
    title,
    logline: `A ${style} story driven by ${emotion} — ${trimmed.toLowerCase()}.`,
    summary: `This project follows ${trimmed}. Scene-by-scene narration, dialogue, and visual direction are pre-planned for ${audience} audiences.`,
    targetAudience: audience,
    tone: `${emotion}, ${style}, approachable`,
    musicMood: "Light upbeat acoustic",
    soundEnvironment: "Kitchen ambience, subtle sizzle",
    cta: "Try it yourself — start in HomeCheff Studio.",
    scenes: [
      {
        id: slugScene(0),
        title: "Opening hook",
        script: `We open on the idea: ${trimmed}.`,
        visualDescription: "Close-up hero shot with natural light and clean framing.",
        voiceOver: `Ever wondered how to ${trimmed.toLowerCase()}?`,
        subtitle: trimmed,
      },
      {
        id: slugScene(1),
        title: "Process beat",
        script: "Show the key steps with clarity and rhythm.",
        visualDescription: "Medium shots of hands, ingredients, and transformation.",
        voiceOver: "Follow each step — AI helps you stay on track.",
        subtitle: "Step by step",
      },
      {
        id: slugScene(2),
        title: "Payoff",
        script: "Reveal the final result and invite action.",
        visualDescription: "Hero reveal with logo-safe lower third space.",
        voiceOver: "Your version is ready to share.",
        subtitle: "Ready to publish",
      },
    ],
    assetRequirements: [
      { kind: "character", label: "Host or chef", required: false },
      { kind: "location", label: "Kitchen or studio set", required: true },
      { kind: "prop", label: "Hero product or ingredient", required: true },
      { kind: "world", label: "Brand look & feel", required: false },
    ],
  };
}

export function rewriteStudioStoryline(
  story: StudioGeneratedStoryline,
  mode: StudioStoryRewriteMode
): StudioGeneratedStoryline {
  if (mode === "shorter") {
    return {
      ...story,
      scenes: story.scenes.slice(0, 2),
      summary: story.summary.split(".").slice(0, 2).join(".") + ".",
    };
  }
  if (mode === "commercial") {
    return { ...story, tone: "Bold, product-forward, conversion-focused", cta: "Shop now — limited time offer." };
  }
  if (mode === "emotional") {
    return { ...story, tone: "Intimate, heartfelt, human", musicMood: "Soft piano and strings" };
  }
  if (mode === "cinematic") {
    return { ...story, tone: "Cinematic, slow reveals, rich contrast", musicMood: "Orchestral swell" };
  }
  return buildStudioStorylineFromIdea(story.title);
}
