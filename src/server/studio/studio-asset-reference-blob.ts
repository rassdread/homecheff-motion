import { registerUserGeneratedReference } from "@/server/studio/studio-user-generated-reference-manifest-blob";
import { registerGeneratedReferenceInLibrary } from "@/server/studio/library-consistency-hooks";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

const KIND_FOLDER: Record<StudioAssetKind, string> = {
  character: "characters",
  prop: "props",
  location: "locations",
  world: "worlds",
};

export async function uploadStudioAssetReferenceBuffers(params: {
  ownerId: string;
  kind: StudioAssetKind;
  generationId: string;
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
  imageContentType: string;
  thumbContentType: string;
  promptSummary?: string;
  sourceAssetName?: string | null;
  sourceAssetId?: string | null;
  origin?: "generated" | "derived";
  projectTitle?: string | null;
  sourceModule?: import("@/types/library-consistency").LibrarySourceModule;
}): Promise<{ referenceImageUrl: string; referenceStorageKey: string; thumbnailUrl: string }> {
  const folder = KIND_FOLDER[params.kind];
  const base = `studio/${params.ownerId}/wizard-references/${folder}/${params.generationId}`;
  const ext = params.imageContentType.includes("jpeg") ? "jpg" : "png";
  const thumbExt = params.thumbContentType.includes("jpeg") ? "jpg" : "png";

  const main = await uploadPublicBlob({
    pathname: `${base}/main.${ext}`,
    body: params.imageBuffer,
    contentType: params.imageContentType,
    allowOverwrite: true,
    context: {
      uploadTarget: base,
      provider: "studio_asset_reference",
    },
  });

  const thumb = await uploadPublicBlob({
    pathname: `${base}/thumb.${thumbExt}`,
    body: params.thumbnailBuffer,
    contentType: params.thumbContentType,
    allowOverwrite: true,
    context: {
      uploadTarget: `${base}/thumb`,
      provider: "studio_asset_reference",
    },
  });

  const result = {
    referenceImageUrl: main.url,
    referenceStorageKey: main.pathname,
    thumbnailUrl: thumb.url,
  };

  await registerUserGeneratedReference({
    generationId: params.generationId,
    ownerId: params.ownerId,
    kind: params.kind,
    createdAt: new Date().toISOString(),
    promptSummary: params.promptSummary?.trim() || "Generated reference",
    referenceImageUrl: result.referenceImageUrl,
    referenceStorageKey: result.referenceStorageKey,
    thumbnailUrl: result.thumbnailUrl,
    sourceAssetName: params.sourceAssetName ?? null,
    sourceAssetId: params.sourceAssetId ?? null,
    origin: params.origin ?? "generated",
  });

  await registerGeneratedReferenceInLibrary({
    ownerId: params.ownerId,
    createdBy: params.ownerId,
    generationId: params.generationId,
    kind: params.kind,
    assetUrl: result.referenceImageUrl,
    storageKey: result.referenceStorageKey,
    thumbnailUrl: result.thumbnailUrl,
    promptSummary: params.promptSummary,
    projectId: params.sourceAssetId,
    projectTitle: params.projectTitle ?? params.sourceAssetName,
    sourceModule: params.sourceModule ?? "wizard",
  });

  return result;
}
