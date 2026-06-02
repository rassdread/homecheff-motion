/** Generic local object detector types (permissive ONNX models only). */

import type { NormalizedBox } from "@/server/animation-export/local-vision/types";

export type ObjectDetectorKind = "rtdetr" | "mobilenet-ssd" | "custom-onnx";

export type ObjectDetection = {
  label: string;
  confidence: number;
  box: NormalizedBox;
};

export type ObjectDetectionResult = {
  detections: ObjectDetection[];
  failed?: boolean;
  error?: string;
  detectorKind?: ObjectDetectorKind;
};

export type ObjectDetectorModelMetadata = {
  kind: ObjectDetectorKind;
  modelFile: string;
  source: string;
  license: string;
  downloadedAt: string;
};

/** COCO class names (80 classes) shared by RT-DETR and SSD MobileNet exports. */
export const COCO_CLASS_NAMES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
  "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
  "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
  "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
  "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
  "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
  "toothbrush",
] as const;
