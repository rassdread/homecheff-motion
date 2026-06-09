import type { AssetLifecycleManifestFields } from "@/types/studio-asset-lifecycle";

/** Blob manifest for wizard-generated reference images (no Prisma migration). */

export type UserGeneratedReferenceRecord = {
  generationId: string;
  ownerId: string;
  kind: string;
  createdAt: string;
  promptSummary: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  thumbnailUrl: string | null;
  sourceAssetName: string | null;
  sourceAssetId: string | null;
  origin: "generated" | "derived";
} & AssetLifecycleManifestFields;

export type UserGeneratedReferenceManifest = {
  version: 1;
  ownerId: string;
  updatedAt: string;
  references: UserGeneratedReferenceRecord[];
};
