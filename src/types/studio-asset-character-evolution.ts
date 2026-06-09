/** Canonical Character Evolution — official mascot-to-role lineage workflow. */

export const CHARACTER_EVOLUTION_CHOICES = [
  "variant",
  "canonical_character_base",
  "animation_ready_character",
] as const;

export type CharacterEvolutionChoice = (typeof CHARACTER_EVOLUTION_CHOICES)[number];

export type CanonicalEvolutionEyesChoice =
  | "preserve_original"
  | "subtle_animation"
  | "full_character_eyes";

export type CanonicalEvolutionMouthChoice = "preserve_original" | "animation_friendly";

export type CanonicalEvolutionExpressionsChoice = "limited" | "normal" | "extended";

export type CanonicalEvolutionBodyConstructionChoice =
  | "preserve_proportions"
  | "subtle_expand"
  | "full_character_body";

export type CanonicalEvolutionPostureChoice = "small" | "medium" | "large";

export type CanonicalEvolutionBuildChoice = "slim" | "average" | "sturdy";

export type CanonicalEvolutionStripAccessories = {
  globe: boolean;
  tools: boolean;
  chefAttributes: boolean;
  gardenAttributes: boolean;
};

export type CanonicalEvolutionConstruction = {
  eyes: CanonicalEvolutionEyesChoice;
  mouth: CanonicalEvolutionMouthChoice;
  expressions: CanonicalEvolutionExpressionsChoice;
  bodyConstruction: CanonicalEvolutionBodyConstructionChoice;
  posture: CanonicalEvolutionPostureChoice;
  build: CanonicalEvolutionBuildChoice;
  stripAccessories: CanonicalEvolutionStripAccessories;
};

export const DEFAULT_CANONICAL_EVOLUTION_CONSTRUCTION: CanonicalEvolutionConstruction = {
  eyes: "subtle_animation",
  mouth: "animation_friendly",
  expressions: "normal",
  bodyConstruction: "subtle_expand",
  posture: "medium",
  build: "average",
  stripAccessories: {
    globe: true,
    tools: true,
    chefAttributes: true,
    gardenAttributes: true,
  },
};
