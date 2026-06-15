import type { StudioV10NarrativeMode } from "@/types/studio-v10-story-planning";

export type StudioV11ConfidenceLevel = "high" | "medium" | "low";

export type StudioV11ConfidenceField =
  | "goal"
  | "audience"
  | "cta"
  | "duration"
  | "narrativeType"
  | "characters"
  | "locations"
  | "products"
  | "emotion"
  | "dialogueMode";

export type StudioV11FieldConfidence = {
  field: StudioV11ConfidenceField;
  level: StudioV11ConfidenceLevel;
  suggestion: string | string[];
  reasonKey: string;
};

export type StudioV11DirectorSuggestions = {
  characters: string[];
  locations: string[];
  products: string[];
  goal: string;
  audience: string;
  cta: string;
  narrativeType: string;
  emotion: string;
  durationLabel: string;
  durationSeconds: number;
  dialogueMode: StudioV10NarrativeMode;
};

export type StudioV11QuestionKind =
  | "cta"
  | "narrative"
  | "voice"
  | "characters"
  | "duration"
  | "audience"
  | "goal"
  | "emotion"
  | "locations"
  | "products"
  | "confirm";

export type StudioV11DynamicQuestion = {
  id: string;
  field: StudioV11ConfidenceField;
  kind: StudioV11QuestionKind;
  required: boolean;
  prompt: string;
  explanation: string;
  options: Array<{ id: string; label: string }>;
  suggestion?: string;
};

export type StudioV11DirectorWizardState = {
  version: 1;
  locale: "nl" | "en";
  suggestions: StudioV11DirectorSuggestions;
  fieldConfidences: StudioV11FieldConfidence[];
  questions: StudioV11DynamicQuestion[];
  answers: Record<string, string>;
  skippedFields: StudioV11ConfidenceField[];
  overallConfidence: StudioV11ConfidenceLevel;
  phase: "interpretation" | "questions" | "complete";
  currentQuestionIndex: number;
  builtAt: string;
  updatedAt: string;
};
