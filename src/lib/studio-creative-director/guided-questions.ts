/**
 * S.6G — Guided question metadata driven by pack registry keys.
 * UI renders from this; no per-pack React flows.
 */

import type { CreativeIntentAnswers } from "@/lib/studio-creative-director/creative-planner";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import { getProductExperience } from "@/lib/studio-creative-director/product-experience-registry";
import type { StudioProductMode } from "@/lib/studio-creative-director/types";

export type GuidedQuestionType =
  | "single_choice"
  | "boolean"
  | "short_text"
  | "platform_choice"
  | "style_choice";

export type GuidedQuestionOption = {
  value: string;
  /** Consumer-facing label (no jargon). */
  label: string;
};

export type GuidedQuestionDef = {
  id: string;
  /** Maps into CreativeIntentAnswers. */
  answerKey: keyof CreativeIntentAnswers;
  type: GuidedQuestionType;
  label: string;
  help?: string;
  options?: GuidedQuestionOption[];
  /** QUICK only shows essential; PROFESSIONAL may show more. */
  modes: StudioProductMode[];
};

const PLATFORM_OPTIONS: GuidedQuestionOption[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
];

/** Registry quickQuestion id → definition (shared across packs). */
const QUESTION_LIBRARY: Record<string, GuidedQuestionDef> = {
  business_style: {
    id: "business_style",
    answerKey: "businessStyle",
    type: "style_choice",
    label: "Business style?",
    options: [
      { value: "corporate", label: "Corporate & polished" },
      { value: "startup", label: "Modern & approachable" },
      { value: "creative", label: "Creative" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  background: {
    id: "background",
    answerKey: "background",
    type: "single_choice",
    label: "Background?",
    options: [
      { value: "office", label: "Office" },
      { value: "clean_neutral", label: "Clean & simple" },
      { value: "soft_blur", label: "Background softly blurred" },
      { value: "outdoor_natural", label: "Outdoor light" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  smile: {
    id: "smile",
    answerKey: "smile",
    type: "single_choice",
    label: "Expression?",
    options: [
      { value: "soft", label: "Soft smile" },
      { value: "natural", label: "Natural smile" },
      { value: "serious", label: "Confident & serious" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  attire: {
    id: "attire",
    answerKey: "suit",
    type: "single_choice",
    label: "Clothing?",
    options: [
      { value: "navy", label: "Navy suit / blazer" },
      { value: "business", label: "Business casual" },
      { value: "smart_casual", label: "Smart casual" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  logo: {
    id: "logo",
    answerKey: "logo",
    type: "boolean",
    label: "Include your logo?",
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  brand_colors: {
    id: "brand_colors",
    answerKey: "brandColors",
    type: "short_text",
    label: "Brand colors?",
    help: "Optional — e.g. warm red, forest green",
    modes: ["PROFESSIONAL", "DIRECTOR"],
  },
  audience: {
    id: "audience",
    answerKey: "audience",
    type: "short_text",
    label: "Who is this for?",
    help: "e.g. local diners, families, foodies",
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  platform: {
    id: "platform",
    answerKey: "platform",
    type: "platform_choice",
    label: "Where will you share it?",
    options: PLATFORM_OPTIONS,
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  commercial_tone: {
    id: "commercial_tone",
    answerKey: "commercialTone",
    type: "single_choice",
    label: "Tone?",
    options: [
      { value: "appetizing", label: "Appetizing" },
      { value: "premium", label: "Premium / luxury" },
      { value: "friendly", label: "Friendly & local" },
      { value: "energetic", label: "Energetic" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  dish: {
    id: "dish",
    answerKey: "dish",
    type: "short_text",
    label: "What dish or product?",
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  appetite: {
    id: "appetite",
    answerKey: "appetite",
    type: "single_choice",
    label: "Look & feel?",
    options: [
      { value: "steam_fresh", label: "Fresh with steam" },
      { value: "closeup", label: "Close-up delicious" },
      { value: "lifestyle", label: "Lifestyle plating" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  vibe: {
    id: "vibe",
    answerKey: "mood",
    type: "style_choice",
    label: "Vibe?",
    options: [
      { value: "natural", label: "Natural" },
      { value: "playful", label: "Playful" },
      { value: "romantic", label: "Romantic" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  outdoor_indoor: {
    id: "outdoor_indoor",
    answerKey: "background",
    type: "single_choice",
    label: "Setting?",
    options: [
      { value: "outdoor_natural", label: "Outdoor" },
      { value: "indoor_cozy", label: "Indoor" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  moment: {
    id: "moment",
    answerKey: "story",
    type: "single_choice",
    label: "Which moment?",
    options: [
      { value: "entrance", label: "Entrance" },
      { value: "vows", label: "Emotional close-up" },
      { value: "celebration", label: "Celebration" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  mood: {
    id: "mood",
    answerKey: "mood",
    type: "style_choice",
    label: "Mood?",
    options: [
      { value: "romantic", label: "Romantic" },
      { value: "joyful", label: "Joyful" },
      { value: "cinematic", label: "Cinematic" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  music: {
    id: "music",
    answerKey: "music",
    type: "single_choice",
    label: "Music feel?",
    options: [
      { value: "soft_piano", label: "Soft piano" },
      { value: "upbeat", label: "Upbeat" },
      { value: "none", label: "No preference" },
    ],
    modes: ["PROFESSIONAL", "DIRECTOR"],
  },
  energy: {
    id: "energy",
    answerKey: "energy",
    type: "single_choice",
    label: "Energy?",
    options: [
      { value: "calm", label: "Calm" },
      { value: "medium", label: "Balanced" },
      { value: "high", label: "High energy" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  style: {
    id: "style",
    answerKey: "styleProfile",
    type: "style_choice",
    label: "Style?",
    options: [
      { value: "clean", label: "Clean" },
      { value: "cinematic", label: "Cinematic" },
      { value: "social", label: "Social-ready" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  runway_or_lookbook: {
    id: "runway_or_lookbook",
    answerKey: "story",
    type: "single_choice",
    label: "Format?",
    options: [
      { value: "runway", label: "Runway motion" },
      { value: "lookbook", label: "Lookbook stills" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
};

/** Outfit Studio extras (not all in registry quickQuestions yet). */
const OUTFIT_QUESTIONS: GuidedQuestionDef[] = [
  {
    id: "outfit_style",
    answerKey: "styleProfile",
    type: "style_choice",
    label: "Look style?",
    options: [
      { value: "casual", label: "Casual" },
      { value: "business", label: "Business" },
      { value: "fashion", label: "Fashion editorial" },
      { value: "outdoor", label: "Outdoor fashion" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  {
    id: "outfit_light",
    answerKey: "lighting",
    type: "single_choice",
    label: "Lighting?",
    options: [
      { value: "soft_studio", label: "Soft studio" },
      { value: "natural_daylight", label: "Natural daylight" },
      { value: "golden_hour", label: "Warm evening light" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
];

const ANIMATION_QUESTIONS: GuidedQuestionDef[] = [
  {
    id: "anim_energy",
    answerKey: "energy",
    type: "single_choice",
    label: "Motion energy?",
    options: [
      { value: "calm", label: "Gentle" },
      { value: "medium", label: "Natural" },
      { value: "high", label: "More dynamic" },
    ],
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
  {
    id: "anim_platform",
    answerKey: "platform",
    type: "platform_choice",
    label: "Where will you share it?",
    options: PLATFORM_OPTIONS,
    modes: ["QUICK", "PROFESSIONAL", "DIRECTOR"],
  },
];

function fromRegistryKeys(
  keys: string[],
  mode: StudioProductMode
): GuidedQuestionDef[] {
  const out: GuidedQuestionDef[] = [];
  for (const key of keys) {
    const def = QUESTION_LIBRARY[key];
    if (!def) continue;
    if (!def.modes.includes(mode)) continue;
    out.push(def);
  }
  return out;
}

/**
 * Resolve guided questions for a pack + mode.
 * Registry-driven; P0 packs may append curated extras.
 */
export function getGuidedQuestionsForPack(input: {
  experienceId: StudioProductExperienceId;
  mode: StudioProductMode;
}): GuidedQuestionDef[] {
  const entry = getProductExperience(input.experienceId);
  let questions = fromRegistryKeys(entry.quickQuestions, input.mode);

  if (input.experienceId === "IDENTITY_OUTFIT") {
    questions = [...OUTFIT_QUESTIONS.filter((q) => q.modes.includes(input.mode))];
  }
  if (input.experienceId === "CREATIVE_ANIMATION" && questions.length === 0) {
    questions = ANIMATION_QUESTIONS.filter((q) => q.modes.includes(input.mode));
  }

  // Quick: cap length for speed
  if (input.mode === "QUICK") {
    return questions.slice(0, 5);
  }
  return questions;
}

/** Apply a question answer into CreativeIntentAnswers. */
export function applyGuidedAnswer(
  answers: CreativeIntentAnswers,
  question: GuidedQuestionDef,
  value: string | boolean | null
): CreativeIntentAnswers {
  const next = { ...answers };
  if (question.type === "boolean") {
    next[question.answerKey] = (value === true || value === "true") as never;
  } else if (value == null || value === "") {
    next[question.answerKey] = null as never;
  } else {
    next[question.answerKey] = value as never;
  }
  // LinkedIn attire ↔ suit
  if (question.id === "attire" && typeof value === "string") {
    next.suit = value;
    next.attire = value;
  }
  return next;
}
