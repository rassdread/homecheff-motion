import type { BrandAssetBounds, BrandAssetQuad } from "@/types/brand-asset-protection";
import type { EditorInstructionObjectBounds } from "@/types/editor-instruction-studio";

export const VISION_TARGET_CONFIDENCE_TIERS = [
  "very_high",
  "likely",
  "review_recommended",
] as const;

export type VisionTargetConfidenceTier = (typeof VISION_TARGET_CONFIDENCE_TIERS)[number];

export const VISION_TARGET_GEOMETRY_PRIORITIES = [
  "polygon",
  "mask",
  "quad",
  "bbox",
] as const;

export type VisionTargetGeometryPriority = (typeof VISION_TARGET_GEOMETRY_PRIORITIES)[number];

export type VisionTargetGeometry = {
  priority: VisionTargetGeometryPriority;
  bounds: EditorInstructionObjectBounds;
  polygon?: Array<{ x: number; y: number }>;
  maskUrl?: string;
  quad?: BrandAssetQuad;
};

export type VisionTargetNodeV2 = {
  id: string;
  label: string;
  rawLabel: string;
  normalizedKey: string;
  category: string;
  confidence: number;
  confidenceTier: VisionTargetConfidenceTier;
  parentId?: string;
  children: VisionTargetNodeV2[];
  hierarchyNodeId?: string;
  partId?: string;
  layerId?: string;
  objectId?: string;
  geometry?: VisionTargetGeometry;
  brandingEligible: boolean;
  motionEligible: boolean;
  fusionEligible: boolean;
  source: string;
  selectable: boolean;
};

export type VisionTargetTreeV2 = {
  roots: VisionTargetNodeV2[];
  datasource: string;
  totalSelectable: number;
  hasChildParts: boolean;
};

export type VisionTargetSelection = {
  targetIds: string[];
  nodes: VisionTargetNodeV2[];
  primary: VisionTargetNodeV2 | null;
};

export type VisionPlacementTargetRef = {
  targetObjectId: string;
  targetLabel: string;
  targetBounds: BrandAssetBounds;
  quad?: BrandAssetQuad;
  hierarchyNodeId?: string;
  partId?: string;
  normalizedTargetKey?: string;
};

export type VisionSourceAuditEntry = {
  source: string;
  populated: boolean;
  storedAt: string[];
  readAt: string[];
  displayedAt: string[];
  lostAt: string[];
  workflows: string[];
  count?: number;
};

export type VisionSourceAuditReport = {
  sources: VisionSourceAuditEntry[];
  generatedAt: string;
};

export type VisionWorkflowCoverageRow = {
  workflow: string;
  used: string[];
  ignored: string[];
  available: string[];
  recommendation: string;
};

export type VisionWorkflowCoverageReport = {
  workflows: VisionWorkflowCoverageRow[];
  generatedAt: string;
};

export type VisionTreeConsistencyRow = {
  nodeType: string;
  treeUses: string[];
  brandingUses: string[];
  fusionUses: string[];
  motionUses: string[];
  mismatch: boolean;
  notes: string;
};

export type VisionTreeConsistencyReport = {
  rows: VisionTreeConsistencyRow[];
  generatedAt: string;
};

export type VisionTargetOpportunityRow = {
  category: string;
  available: string[];
  notVisible: string[];
  notUsed: string[];
};

export type VisionTargetOpportunityReport = {
  categories: VisionTargetOpportunityRow[];
  generatedAt: string;
};

export type VisionTargetPickerAuditCard = {
  source: string;
  polygon: boolean;
  mask: boolean;
  quad: boolean;
  targetLabel: string;
  confidenceTier: VisionTargetConfidenceTier;
  brandingEligible: boolean;
  motionEligible: boolean;
};
