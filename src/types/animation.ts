export type { AnimationPresetId } from "@/lib/animation-presets";
export type {
  AnimationUsageResponse,
  CreateAnimationProjectRequest,
  CreateAnimationProjectResponse,
} from "@/types/animation-api";

export type AnimationStatus =
  | "idle"
  | "queued"
  | "generating"
  | "rendering"
  | "completed"
  | "failed";

export type ProjectStatus = AnimationStatus;

export type ExportStatus =
  | "idle"
  | "queued"
  | "rendering"
  | "completed"
  | "failed";

export type AnimationImage = {
  id: string;
  clientUploadId: string;
  originalFileName: string;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
  workingImageUrl?: string;
  thumbnailUrl?: string;
  workingStorageKey?: string;
  thumbnailStorageKey?: string;
  mimeType: string;
  sizeBytes: number;
  /** Set after local preprocess; used for lightweight intent hints only. */
  naturalWidth?: number;
  naturalHeight?: number;
};

export type AnimationTransition = {
  id: string;
  order?: number;
  startImageName: string;
  endImageName: string;
  startPreviewUrl: string;
  endPreviewUrl: string;
  status: AnimationStatus;
  progress: number;
  outputVideoUrl?: string | null;
  errorMessage?: string | null;
};
