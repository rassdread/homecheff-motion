export type CreateAnimationProjectImageInput = {
  fileName: string;
  previewUrl: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateAnimationProjectRequest = {
  images: CreateAnimationProjectImageInput[];
  stylePreset?: string;
  aspectRatio?: string;
};

export type CreatedAnimationTransition = {
  id: string;
  order: number;
};

export type CreateAnimationProjectResponse = {
  projectId: string;
  transitionsCount: number;
  transitions: CreatedAnimationTransition[];
};

export type PatchAnimationProjectStatusRequest = {
  projectStatus?: string;
  transition?: {
    id?: string;
    order?: number;
    status?: string;
    progress?: number;
  };
  exportStatus?: {
    status?: string;
    progress?: number;
    outputVideoUrl?: string | null;
    errorMessage?: string | null;
  };
};
