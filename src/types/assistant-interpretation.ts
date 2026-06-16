import type { AssistantActionId } from "@/lib/assistant-action-registry";

export type AssistantInterpretationConfidence = "high" | "medium" | "low";

export type AssistantInterpretationTargetModule =
  | "studio"
  | "editor"
  | "motion"
  | "publish"
  | "characters"
  | "fusion"
  | "projects"
  | "library";

export type AssistantInterpretationSource = "rules" | "llm";

export type AssistantInterpretationEntities = {
  people?: string[];
  characters?: string[];
  assets?: string[];
  locations?: string[];
  products?: string[];
  actions?: string[];
  style?: string[];
  constraints?: string[];
};

export type AssistantInterpretationQuestion = {
  id: string;
  label: string;
  reason: string;
  options: string[];
  required: boolean;
  affectsSettings: string[];
};

export type AssistantInterpretationIntensity = "subtle" | "balanced" | "high";

export type AssistantInterpretationAlternative = {
  label: string;
  intent: string;
  presetId?: string;
  reason: string;
};

export type AssistantInterpretation = {
  originalMessage: string;
  understoodGoal: string;
  detectedIntent: string;
  confidence: AssistantInterpretationConfidence;
  targetModule: AssistantInterpretationTargetModule;
  likelyActionId: AssistantActionId | "unknown";
  extractedEntities: AssistantInterpretationEntities;
  inferredSettings: Record<string, unknown>;
  missingInputs: string[];
  followUpQuestions: AssistantInterpretationQuestion[];
  safetyOrFeasibilityNotes?: string[];
  suggestedRoute?: string;
  source: AssistantInterpretationSource;
  /** V6 conversational enrichment */
  normalizedMeaning?: string;
  creativeGoal?: string;
  emotionalTone?: string[];
  styleHints?: string[];
  constraints?: string[];
  intensity?: AssistantInterpretationIntensity;
  likelyPresetId?: string;
  alternativeIntents?: AssistantInterpretationAlternative[];
  prefillHints?: Record<string, unknown>;
};

export type AssistantInterpretationContext = {
  locale?: "nl" | "en";
  projectId?: string | null;
  projectTitle?: string | null;
  isAuthenticated?: boolean;
  snapshot?: import("@/lib/assistant-context-layer").AssistantContextSnapshot;
};
