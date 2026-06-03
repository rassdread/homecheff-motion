/**
 * Instant wizard local image — identity + blobs in memory/IDB only.
 * Never store blob: object URLs in React state or persistence.
 */

import type { BakedTextProtectionDraft } from "@/components/instant/baked-text-protection-panel";

export type InstantWizardLocalImage = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  bakedText: BakedTextProtectionDraft;
  remoteWorkingUrl?: string;
  remoteThumbnailUrl?: string;
  remoteStorageKey?: string;
  /** True when preview cannot be resolved (missing blob + no remote). */
  previewUnavailable?: boolean;
};

export const EMPTY_WIZARD_IMAGE_BLOB = new Blob([], { type: "image/jpeg" });

export function hasWizardImageBlobPayload(image: InstantWizardLocalImage): boolean {
  return image.optimizedBlob.size > 0 && image.thumbnailBlob.size > 0;
}
