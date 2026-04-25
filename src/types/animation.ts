export type AnimationStatus =
  | "idle"
  | "queued"
  | "generating"
  | "rendering"
  | "completed"
  | "failed";

export type ProjectStatus = AnimationStatus;

export type ExportStatus = "idle" | "rendering" | "completed" | "failed";

export type AnimationImage = {
  id: string;
  originalFileName: string;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
  mimeType: string;
  sizeBytes: number;
};

export type AnimationTransition = {
  id: string;
  startImageName: string;
  endImageName: string;
  startPreviewUrl: string;
  endPreviewUrl: string;
  status: AnimationStatus;
  progress: number;
};
