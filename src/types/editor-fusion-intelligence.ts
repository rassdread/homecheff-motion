/** Fusion Intelligence Layer — analysis profiles, blueprints, render payloads. */

import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionColor } from "@/types/studio-asset-vision-analysis";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const FUSION_REFERENCE_ANALYSIS_VERSION = 1;

export type ReferenceAnalysisPart = {
  id: string;
  label: string;
  category: "face" | "eyes" | "mouth" | "hair" | "clothing" | "accessories" | "pose" | "background" | "product" | "animal" | "other";
  description?: string;
  confidence?: number;
};

export type ReferenceAnalysisProfile = {
  referenceId: string;
  assetId: string;
  imageUrl: string;
  role?: string;
  roleId?: string;
  name?: string;
  analysisVersion: number;
  analyzedAt: string;
  styleDNA?: AssetStyleDna;
  parts: ReferenceAnalysisPart[];
  clothing: string[];
  accessories: string[];
  colors: AssetVisionColor[];
  pose?: string;
  background?: string;
  identityTraits: string[];
  objectType?: string;
  confidence: number;
  premiumCached: boolean;
};

export type FusionBlueprintTraitSource =
  | string
  | "blend"
  | "harmonized"
  | "new"
  | "reference_a"
  | "reference_b"
  | "primary"
  | "secondary";

export type FusionBlueprint = {
  id: string;
  workflowType: EditorFusionIntent;
  createdAt: string;
  references: Array<{
    referenceId: string;
    role?: string;
    roleId?: string;
    name?: string;
    summary: string;
  }>;
  traitAssignments: Record<string, FusionBlueprintTraitSource>;
  renderInstructions: string[];
  preservationRules: string[];
  styleNotes: string[];
  simulationDisclaimer?: string;
};

export type FusionRenderReference = {
  referenceId: string;
  role?: string;
  url: string;
  name?: string;
  isLogo?: boolean;
};

export type FusionRenderPayload = {
  blueprint: FusionBlueprint;
  styleDNA: Array<{ referenceId: string; styleDNA: AssetStyleDna }>;
  referenceAnalysis: ReferenceAnalysisProfile[];
  renderInstructions: string[];
  references: FusionRenderReference[];
  logoAssets: FusionRenderReference[];
  primaryImageUrl: string;
};

export type FusionIntelligenceState = {
  workflowType: EditorFusionIntent;
  referenceProfiles: ReferenceAnalysisProfile[];
  blueprint?: FusionBlueprint;
  renderPayload?: FusionRenderPayload;
  builtAt?: string;
  analysisCreditsRequired: number;
  analysisCreditsCached: number;
  renderCredits: number;
  lastRun?: FusionRunRecord;
};

export type FusionWorkflowCostLog = {
  workflowType: EditorFusionIntent;
  analysisCostUsd: number;
  blueprintCostUsd: number;
  renderCostUsd: number;
  totalCostUsd: number;
  creditsCharged: number;
  estimatedProfitUsd: number;
  profitMarginPercent: number;
  provider?: string;
  model?: string;
  imageCount: number;
  referenceCount?: number;
  durationMs?: number;
  status?: "completed" | "failed";
  errorCode?: string | null;
  timestamp: string;
};

export type FusionRunRecord = {
  fusionWorkflowType: EditorFusionIntent;
  fusionBlueprintId: string | null;
  referencesUsed: string[];
  premiumAnalysesUsed: number;
  cachedAnalysesUsed: number;
  creditsCharged: number;
  providerCostUsd: number;
  estimatedProfitUsd: number;
  providerSupportsMultiReference: boolean;
  referenceImageCount: number;
  status: "completed" | "failed";
  errorCode?: string | null;
  completedAt: string;
};

export type FusionAnalysisReadiness = {
  requiredReferenceCount: number;
  analyzedCount: number;
  cachedCount: number;
  missingCount: number;
  allReady: boolean;
  profiles: ReferenceAnalysisProfile[];
};
