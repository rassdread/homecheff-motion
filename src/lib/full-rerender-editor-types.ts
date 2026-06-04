import type { InstantSceneTextDraft } from "@/lib/instant-scene-text-draft-model";

/** One scene row in the full-rerender editor (image + text move together). */
export type FullRerenderEditorImage = {
  id: string;
  previewUrl: string;
  originalFileName: string;
  /** True when this row will create a new DB image on render. */
  isNew?: boolean;
  /** True when an existing project image was replaced via upload. */
  isReplaced?: boolean;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  remoteStorageKey?: string;
};

export type FullRerenderEditorSlot = {
  sceneId: string;
  image: FullRerenderEditorImage | null;
  text: InstantSceneTextDraft;
};

export type FullRerenderImageSequenceEntry = {
  /** Omit for newly added images (server creates row). */
  imageId?: string;
  fileName: string;
  previewUrl: string;
  workingImageUrl: string;
  workingStorageKey?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type FullRerenderImageChangesPayload = {
  sequence: FullRerenderImageSequenceEntry[];
};

export type FullRerenderImageChangeAudit = {
  beforeImageCount: number;
  afterImageCount: number;
  reordered: boolean;
  addedCount: number;
  removedCount: number;
  replacedCount: number;
  addedImageIds?: string[];
  removedImageIds?: string[];
  replacedImageIds?: string[];
};
