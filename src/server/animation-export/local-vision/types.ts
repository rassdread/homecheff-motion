/** Normalized bounding box (0–1 fractions of frame width/height). */
export type NormalizedBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MediaPipeDetectionType = "face" | "person" | "hand" | "body";

export type MediaPipeDetection = {
  type: MediaPipeDetectionType;
  confidence: number;
  box: NormalizedBox;
};

export type MediaPipeDetectionResult = {
  detections: MediaPipeDetection[];
  failed?: boolean;
  error?: string;
};

export type ObjectDetection = {
  label: string;
  confidence: number;
  box: NormalizedBox;
};

export type ObjectDetectionResult = {
  detections: ObjectDetection[];
  failed?: boolean;
  error?: string;
  detectorKind?: "rtdetr" | "mobilenet-ssd" | "custom-onnx";
};

export type AvoidBox = NormalizedBox & {
  source: "mediapipe" | "object";
  label: string;
  confidence: number;
};
