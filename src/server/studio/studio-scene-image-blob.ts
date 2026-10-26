import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

/** Test-only local files. Preview and Production keep the blob upload. */
function localSceneImageDir(): string | null {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return null;
  const raw = process.env.STUDIO_SCENE_IMAGE_LOCAL_DIR?.trim();
  if (!raw || !isAbsolute(raw)) return null;
  const root = resolve(tmpdir());
  const dir = resolve(raw);
  if (dir !== root && !dir.startsWith(`${root}/`)) return null;
  return dir;
}

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
  const localDir = localSceneImageDir();
  if (localDir) {
    await mkdir(localDir, { recursive: true });
    const file = join(localDir, `${params.imageId}.png`);
    await writeFile(file, params.imageBuffer);
    return { imageUrl: `file://${file}`, storageKey: file, thumbnailUrl: `file://${file}` };
  }

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
