import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const CHARACTER_CONSISTENCY_WORKFLOWS = [
  "character_fusion",
  "future_child",
  "genetic_blend",
  "mascot_transform",
  "mascot_into_human",
  "human_into_mascot",
  "mascot_to_human",
  "outfit_from_reference",
  "character_upgrade",
] as const;

export type CharacterConsistencyWorkflow = (typeof CHARACTER_CONSISTENCY_WORKFLOWS)[number];

export type CharacterAttributeKey =
  | "eyes"
  | "eye_color"
  | "glasses"
  | "beard"
  | "mustache"
  | "face_shape"
  | "hair_color"
  | "hair_style"
  | "hair_length"
  | "clothing"
  | "accessories"
  | "style_dna"
  | "mascot_head"
  | "mascot_body"
  | "mascot_emblem"
  | "mascot_palette";

export type CharacterTraceStep = {
  stage:
    | "reference_image"
    | "premium_analysis"
    | "reference_profile"
    | "fusion_blueprint"
    | "render_payload"
    | "prompt"
    | "provider_request";
  attribute: CharacterAttributeKey;
  available: boolean;
  stored: boolean;
  used: boolean;
  lost: boolean;
  ignored: boolean;
};

export type CharacterTraceReport = {
  workflow: EditorFusionIntent;
  steps: CharacterTraceStep[];
  generatedAt: string;
};

export type CharacterAttributeSourceEntry = {
  source: string;
  attributes: CharacterAttributeKey[];
  populated: boolean;
  storedAt: string[];
  readAt: string[];
  usedAt: string[];
  lostAt: string[];
};

export type CharacterAttributeCoverageReport = {
  sources: CharacterAttributeSourceEntry[];
  generatedAt: string;
};

export type CharacterWorkflowCoverageRow = {
  workflow: CharacterConsistencyWorkflow;
  attributeAvailable: boolean;
  attributeUsed: boolean;
  inPrompt: boolean;
  inPayload: boolean;
  notes: string;
};

export type CharacterWorkflowCoverageMatrix = {
  workflows: CharacterWorkflowCoverageRow[];
  generatedAt: string;
};

export type CharacterPromptCoverageItem = {
  attribute: string;
  availableValue: string;
  usedInPrompt: boolean;
};

export type CharacterPromptCoverageReport = {
  workflow: EditorFusionIntent;
  coveragePercent: number;
  items: CharacterPromptCoverageItem[];
  genericPromptLoss: boolean;
  generatedAt: string;
};

export type CharacterBlueprintAudit = {
  workflow: EditorFusionIntent;
  filledAttributes: string[];
  missingAttributes: string[];
  ignoredAttributes: string[];
  unusedFilledAttributes: string[];
  enrichedCharacterBlocks: number;
  generatedAt: string;
};

export type CharacterPayloadCoverageReport = {
  workflow: EditorFusionIntent;
  profileCount: number;
  personProfiles: number;
  mascotProfiles: number;
  consistencyRulesApplied: number;
  attributesInPayload: string[];
  coveragePercent: number;
  generatedAt: string;
};

export type PersonConsistencyProfile = {
  eyes?: string;
  eyeColor?: string;
  glasses?: boolean;
  beard?: boolean;
  mustache?: boolean;
  faceShape?: string;
  hairColor?: string;
  hairStyle?: string;
  hairLength?: string;
  accessories: {
    hat?: string;
    necklace?: string;
    earrings?: string;
    watch?: string;
  };
  clothing: {
    shirt?: string;
    hoodie?: string;
    jacket?: string;
    dress?: string;
  };
  styleDnaSummary?: string;
  dominantColors: string[];
};

export type MascotConsistencyProfile = {
  headShape?: string;
  bodyShape?: string;
  accessories: string[];
  emblems: string[];
  colorPalette: string[];
  visualStyle?: string;
};

export type CharacterConsistencyRuleAction = "preserve" | "inherit" | "blend";

export type CharacterConsistencyRule = {
  attribute: CharacterAttributeKey;
  action: CharacterConsistencyRuleAction;
  source?: "reference_a" | "reference_b" | "blend" | "harmonized";
};

export type CharacterConsistencyRuleSet = {
  workflow: EditorFusionIntent;
  rules: CharacterConsistencyRule[];
};

export type CharacterConsistencyScoreBreakdown = {
  attributeCoverage: number;
  promptCoverage: number;
  blueprintCoverage: number;
  payloadCoverage: number;
  mascotCoverage: number;
  clothingCoverage: number;
  accessoryCoverage: number;
};

export type CharacterConsistencyScore = {
  workflow: EditorFusionIntent;
  characterConsistencyScore: number;
  breakdown: CharacterConsistencyScoreBreakdown;
  generatedAt: string;
};

export type CharacterDriftItem = {
  attribute: string;
  availableValue: string;
  presentInPrompt: boolean;
  drift: boolean;
};

export type CharacterDriftReport = {
  workflow: EditorFusionIntent;
  items: CharacterDriftItem[];
  driftCount: number;
  generatedAt: string;
};

export type CharacterConsistencyAuditReport = {
  workflow: EditorFusionIntent;
  trace: CharacterTraceReport;
  attributeCoverage: CharacterAttributeCoverageReport;
  workflowMatrix: CharacterWorkflowCoverageMatrix;
  promptCoverage: CharacterPromptCoverageReport;
  blueprintAudit: CharacterBlueprintAudit;
  payloadCoverage: CharacterPayloadCoverageReport;
  drift: CharacterDriftReport;
  score: CharacterConsistencyScore;
  generatedAt: string;
};

export type CharacterConsistencyDiagnosticExport = {
  workflow: EditorFusionIntent;
  attributeCoverage: number;
  promptCoverage: number;
  blueprintCoverage: number;
  payloadCoverage: number;
  mascotCoverage: number;
  clothingCoverage: number;
  accessoryCoverage: number;
  characterConsistencyScore: number;
  generatedAt: string;
};
