/**
 * Motion Text Placement V1 — unified subject-aware avoid zones.
 */

export type TextAvoidZoneType =
  | "face"
  | "person"
  | "mascot"
  | "hand"
  | "product"
  | "logo"
  | "existing_text"
  | "primary_subject";

export type TextAvoidZoneSource =
  | "ocr"
  | "mediapipe"
  | "rtdetr"
  | "manual_heuristic"
  | "template_heuristic"
  | "color_heuristic";

export type TextAvoidZone = {
  type: TextAvoidZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  source: TextAvoidZoneSource;
  /** Placement penalty multiplier (0–1+). Higher = stronger avoid. */
  weight: number;
  label?: string;
};

export type TextAvoidZonePlan = {
  zones: TextAvoidZone[];
  /** Sample times (seconds) used to build union, if any. */
  sampleTimesSec: number[];
  heuristicOnly: boolean;
  mascotBoostApplied: boolean;
};

export type TextPlacementCandidate = {
  x: number;
  y: number;
  fontSize: number;
  alignment: number;
  lines: string[];
  band?: string;
  reason?: string;
};

export type TextPlacementScoreBreakdown = {
  readability: number;
  contrast: number;
  marginSafety: number;
  avoidZoneOverlap: number;
  subjectOverlap: number;
  textCollision: number;
  edgeCrowding: number;
  total: number;
};

export type TextSubjectSafetyDebugEntry = {
  layerId: string;
  avoidZones: TextAvoidZone[];
  proposedBox: { left: number; right: number; top: number; bottom: number };
  chosenBox: { left: number; right: number; top: number; bottom: number };
  rejected: Array<{ reason: string; band?: string; score: number }>;
  action: string;
  tightSpaceWarning?: string;
  placedReservations?: Array<{
    layerId: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
};
