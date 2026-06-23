export type BrandQaProjectReport = {
  projectId: string;
  workflowType: string;
  brandLockedAssetsCount: number;
  segmentsChecked: number;
  segmentsPassed: number;
  segmentsWarned: number;
  segmentsFailed: number;
  segmentsCorrected: number;
  correctionRate: number;
  warningRate: number;
  failureRate: number;
  trackingModesUsed: string[];
  surfaceTypesUsed: string[];
  createdAt: string;
};

export type BrandQaWorkflowRow = {
  checked: number;
  corrected: number;
  correctionRate: number;
  mostCommonFailureReason: string | null;
  recommendation: string;
};

export type BrandQaSurfaceRow = {
  checked: number;
  corrected: number;
  correctionRate: number;
  recommendation: string;
};

export type BrandQaTrackingModeRow = {
  trackingMode: string;
  checked: number;
  corrected: number;
  correctionRate: number;
};

export type BrandQaBeforeAfterRow = {
  workflowType: string;
  beforeDynamicTracking: number;
  afterDynamicTracking: number;
  improvementPercent: number;
};

export type BrandQaAggregateReport = {
  projectsChecked: number;
  segmentsChecked: number;
  segmentsCorrected: number;
  overallCorrectionRate: number;
  workflowBreakdown: Record<string, BrandQaWorkflowRow>;
  surfaceTypeBreakdown: Record<string, BrandQaSurfaceRow>;
  trackingModeBreakdown: Record<string, BrandQaTrackingModeRow>;
  beforeAfterDynamicTracking: BrandQaBeforeAfterRow[];
  recommendations: string[];
  highRiskSurfaces: string[];
};

export type BrandQaDiagnosticInput = {
  workflowType?: string;
  surfaceType?: string;
  sampleCount?: number;
};

export type BrandQaDiagnosticResult = {
  workflowType: string;
  surfaceType: string;
  sampleCount: number;
  passRate: number;
  correctionRate: number;
  recommendation: string;
};

export type BrandQaExportPayload = {
  generatedAt: string;
  overall: {
    projectsChecked: number;
    segmentsChecked: number;
    segmentsCorrected: number;
    overallCorrectionRate: number;
  };
  workflows: Record<string, BrandQaWorkflowRow>;
  surfaceTypes: Record<string, BrandQaSurfaceRow>;
  trackingModes: Record<string, BrandQaTrackingModeRow>;
  beforeAfterDynamicTracking: BrandQaBeforeAfterRow[];
  recommendations: string[];
  highRiskSurfaces: string[];
};

export const BRAND_QA_WORKFLOW_TYPES = [
  "product_branding",
  "logo_placement",
  "product_packaging",
  "billboard",
  "campaign_variant",
  "mascot_transform",
  "outfit_from_reference",
  "product_environment",
  "character_fusion",
  "future_child",
] as const;

export const BRAND_QA_SURFACE_TYPES = [
  "billboard",
  "poster",
  "signage",
  "packaging",
  "product_label",
  "product_branding",
  "wall",
  "screen",
  "shirt",
  "vehicle",
  "mug",
  "cup",
  "mascot_emblem",
] as const;

export const BRAND_QA_TRACKING_MODES = [
  "static",
  "quad_interpolation",
  "perspective_segment",
  "keyframe_bake",
  "post_composite",
] as const;
