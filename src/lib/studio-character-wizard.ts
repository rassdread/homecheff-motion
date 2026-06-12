import type { StudioCharacterWizardAnswers } from "@/types/studio-production-brief-v3";

export const CHARACTER_WIZARD_DEFAULTS: StudioCharacterWizardAnswers = {
  type: "human",
  presentation: "neutral",
  ageEnergy: "adult",
  style: "cinematic",
  coreTrait: "friendly",
};

export type EnrichedCharacterConcept = StudioCharacterWizardAnswers & {
  name: string;
  clothing: string;
  personality: string;
  emotions: string;
  voiceStyle: string;
  behavior: string;
  estimatedCredits: number;
};

export function enrichCharacterFromWizard(answers: StudioCharacterWizardAnswers): EnrichedCharacterConcept {
  const trait = answers.coreTrait;
  return {
    ...answers,
    name: `${answers.type} lead`,
    clothing: answers.style === "pixar-like" ? "Colorful stylized outfit" : "Context-appropriate wardrobe",
    personality: `${trait}, approachable, on-brand`,
    emotions: trait === "funny" ? "Playful range" : "Warm and expressive",
    voiceStyle: answers.presentation === "brand" ? "Brand spokesperson" : "Natural conversational",
    behavior: answers.ageEnergy === "child" ? "Curious and energetic" : "Confident and clear",
    estimatedCredits: answers.style === "realistic" ? 4 : 2,
  };
}
