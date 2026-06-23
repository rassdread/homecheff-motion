import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const FUSION_AUDIT_WORKFLOWS = [
  "character_fusion",
  "future_child",
  "genetic_blend",
  "animal_human_fusion",
  "mascot_transform",
  "mascot_into_human",
  "mascot_to_human",
  "human_into_mascot",
  "outfit_from_reference",
  "product_branding",
  "product_packaging",
  "product_environment",
  "logo_placement",
  "campaign_variant",
] as const;

export type FusionAuditWorkflow = (typeof FUSION_AUDIT_WORKFLOWS)[number];

export type FusionDataTraceStep = {
  stage:
    | "upload"
    | "analysis"
    | "reference_profile"
    | "fusion_blueprint"
    | "render_payload"
    | "prompt"
    | "provider_request"
    | "output";
  exists: boolean;
  stored: boolean;
  used: boolean;
  lost: boolean;
  ignored: boolean;
  notes?: string;
};

export type FusionDataTraceReport = {
  workflow: EditorFusionIntent;
  steps: FusionDataTraceStep[];
  generatedAt: string;
};

export type FusionSourceCoverageEntry = {
  source: string;
  populated: boolean;
  storedAt: string[];
  readAt: string[];
  usedAt: string[];
  lostAt: string[];
  count?: number;
};

export type FusionSourceCoverageReport = {
  sources: FusionSourceCoverageEntry[];
  generatedAt: string;
};

export type FusionWorkflowCoverageRow = {
  workflow: FusionAuditWorkflow;
  analysisPresent: boolean;
  analysisUsed: boolean;
  blueprintUsed: boolean;
  promptUsed: boolean;
  providerUsed: boolean;
  outputUsed: boolean;
  notes: string;
};

export type FusionWorkflowCoverageMatrix = {
  workflows: FusionWorkflowCoverageRow[];
  generatedAt: string;
};

export type FusionPromptCoverageItem = {
  label: string;
  available: boolean;
  usedInPrompt: boolean;
};

export type FusionPromptCoverageReport = {
  workflow: EditorFusionIntent;
  availableItems: FusionPromptCoverageItem[];
  promptCoveragePercent: number;
  samplePromptExcerpt: string;
  generatedAt: string;
};

export type FusionBlueprintAudit = {
  workflow: EditorFusionIntent;
  filledFields: string[];
  unusedFilledFields: string[];
  neverPopulatedFields: string[];
  ignoredAnalysisTraits: string[];
  traitAssignmentCount: number;
  enrichedTraitCount: number;
  generatedAt: string;
};

export type FusionProviderPayloadCoverageReport = {
  workflow: EditorFusionIntent;
  promptIncluded: boolean;
  referenceCount: number;
  logoAssetCount: number;
  targetFieldsIncluded: string[];
  protectedAssetCount: number;
  placementDataIncluded: boolean;
  coveragePercent: number;
  generatedAt: string;
};

export type FusionBrandingCoverageReport = {
  workflow: EditorFusionIntent;
  logoPlacementInBlueprint: boolean;
  protectedAssetsInPayload: boolean;
  brandLockedInMotionHandoff: boolean;
  targetsInPrompt: boolean;
  coveragePercent: number;
  generatedAt: string;
};

export type FusionCharacterConsistencyRow = {
  dimension: "face" | "hair" | "eyes" | "accessories" | "clothing" | "style";
  available: boolean;
  inProfile: boolean;
  inBlueprint: boolean;
  inPrompt: boolean;
  inProvider: boolean;
};

export type FusionCharacterConsistencyReport = {
  workflow: EditorFusionIntent;
  rows: FusionCharacterConsistencyRow[];
  coveragePercent: number;
  generatedAt: string;
};

export type FusionQualityScoreBreakdown = {
  visionCoverage: number;
  promptCoverage: number;
  blueprintCoverage: number;
  providerCoverage: number;
  brandCoverage: number;
  characterCoverage: number;
};

export type FusionQualityScore = {
  workflow: EditorFusionIntent;
  totalFusionQualityScore: number;
  breakdown: FusionQualityScoreBreakdown;
  generatedAt: string;
};

export type FusionIntelligenceAuditReport = {
  workflow: EditorFusionIntent;
  dataTrace: FusionDataTraceReport;
  sourceCoverage: FusionSourceCoverageReport;
  workflowMatrix: FusionWorkflowCoverageMatrix;
  promptCoverage: FusionPromptCoverageReport;
  blueprintAudit: FusionBlueprintAudit;
  providerPayload: FusionProviderPayloadCoverageReport;
  brandingCoverage: FusionBrandingCoverageReport;
  characterConsistency: FusionCharacterConsistencyReport;
  qualityScore: FusionQualityScore;
  generatedAt: string;
};

export type FusionIntelligenceDiagnosticExport = {
  workflow: EditorFusionIntent;
  analysisCoverage: number;
  blueprintCoverage: number;
  promptCoverage: number;
  providerCoverage: number;
  characterCoverage: number;
  brandingCoverage: number;
  totalFusionQualityScore: number;
  generatedAt: string;
};
