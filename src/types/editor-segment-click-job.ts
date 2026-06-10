import type { EditorSegmentErrorCode } from "@/lib/editor-segmentation-errors";
import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

export type EditorSegmentClickJobStatus =
  | "queued"
  | "running"
  | "ready"
  | "failed"
  | "timeout";

export type EditorSegmentClickJobResult = {
  selectionMode?: string;
  maskUrl?: string;
  cutoutUrl?: string;
  polygon?: EditorShapePoint[];
  boundingBox: { x: number; y: number; width: number; height: number };
  segmentationSource?: string;
  confidence?: number;
  maskStorageKey?: string;
  alphaMask?: boolean;
  providerUsed?: string;
  predictionId?: string;
  runtimeMs?: number;
};

export type EditorSegmentClickJobTrace = {
  replicatePredictionMs?: number;
  maskFetchMs?: number;
  blobUploadMs?: number;
  totalMs?: number;
};

export type EditorSegmentClickJob = {
  jobId: string;
  userId: string;
  sessionId: string;
  prompt: string;
  imageUrl: string;
  clickPoint: EditorShapePoint;
  parentLayerId: string | null;
  editorObjectId: string;
  targetBounds?: EditorCanvasBounds;
  backgroundStorageKey?: string;
  createCutout: boolean;
  status: EditorSegmentClickJobStatus;
  result?: EditorSegmentClickJobResult;
  errorCode?: EditorSegmentErrorCode;
  errorMessage?: string;
  retryable?: boolean;
  trace?: EditorSegmentClickJobTrace;
  createdAt: number;
  updatedAt: number;
};

export type EditorSegmentClickJobCreateInput = {
  userId: string;
  sessionId: string;
  prompt: string;
  imageUrl: string;
  clickPoint: EditorShapePoint;
  parentLayerId: string | null;
  editorObjectId: string;
  targetBounds?: EditorCanvasBounds;
  backgroundStorageKey?: string;
  createCutout?: boolean;
};
