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

  return {
    referenceImageUrl: main.url,
    referenceStorageKey: main.pathname,
    thumbnailUrl: thumb.url,
  };
}
