import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export async function uploadStudioSceneImageBuffers(params: {
  ownerId: string;
  storyboardId: string;
  sceneId: string;
  imageId: string;
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
  imageContentType: string;
  thumbContentType: string;
}): Promise<{ imageUrl: string; storageKey: string; thumbnailUrl: string }> {
  const base = `studio/${params.ownerId}/storyboards/${params.storyboardId}/scenes/${params.sceneId}/images/${params.imageId}`;
  const ext = params.imageContentType.includes("jpeg") ? "jpg" : "png";
  const thumbExt = params.thumbContentType.includes("jpeg") ? "jpg" : "png";

  const main = await uploadPublicBlob({
    pathname: `${base}/main.${ext}`,
    body: params.imageBuffer,
    contentType: params.imageContentType,
    allowOverwrite: true,
    context: {
      uploadTarget: base,
      provider: "studio_scene_image",
    },
  });

  const thumb = await uploadPublicBlob({
    pathname: `${base}/thumb.${thumbExt}`,
    body: params.thumbnailBuffer,
    contentType: params.thumbContentType,
    allowOverwrite: true,
    context: {
      uploadTarget: `${base}/thumb`,
      provider: "studio_scene_image",
    },
  });

  return {
    imageUrl: main.url,
    storageKey: main.pathname,
    thumbnailUrl: thumb.url,
  };
}
