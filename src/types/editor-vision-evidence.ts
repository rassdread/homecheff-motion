import type { EditorVisionPartSource } from "@/types/homecheff-visual-editor";

export type VisionPartDetectionDecision = "DETECTED" | "ESTIMATED" | "CREATIVE" | "DEBUG" | "REJECTED";

export type VisionPartDetectionExplanation = {
  label: string;
  source: EditorVisionPartSource | "semantic_template";
  confidence: number;
  hasBbox: boolean;
  hasMask: boolean;
  hasPolygon: boolean;
  evidenceBacked: boolean;
  blockedInferredBody: boolean;
  decision: VisionPartDetectionDecision;
  reason: string;
};

export type AccessoryDetectionAuditRow = {
  accessory: string;
  detected: boolean;
  confidence: number | null;
  hasBbox: boolean;
  source: EditorVisionPartSource | "none";
  decision: VisionPartDetectionDecision;
  reason: string;
};

export type EditorVisionEvidenceAuditMeta = {
  visionTrustScore: number;
  accessoryAudit: AccessoryDetectionAuditRow[];
  detectionExplanations: VisionPartDetectionExplanation[];
};
