export type MotionLockProjectMetrics = {
  projectId: string;
  workflowType: string;
  segmentsChecked: number;
  segmentsPassed: number;
  segmentsWarned: number;
  segmentsFailed: number;
  segmentsCorrected: number;
  enforcementRate: number;
  createdAt: string;
  tracking?: import("@/types/motion-lock-tracking").MotionLockTrackingMetrics;
};

export type MotionLockAggregateMetrics = {
  projectsChecked: number;
  segmentsChecked: number;
  segmentsPassed: number;
  segmentsWarned: number;
  segmentsFailed: number;
  segmentsCorrected: number;
  correctionRate: number;
  workflowBreakdown: Record<
    string,
    {
      checked: number;
      corrected: number;
      trackedPercent?: number;
    }
  >;
  trackingModeUsage?: {
    static: number;
    quad_interpolation: number;
  };
  surfaceTypeBreakdown?: Record<string, number>;
  quadTrackingSuccessRate?: number;
  dynamicWarpCount?: number;
  trackedAssetsTotal?: number;
};
