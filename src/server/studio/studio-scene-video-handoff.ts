/**
 * Hands an existing scene still to the existing video provider.
 * Mock certification writes a local file and does not reserve HC.
 * Live Vidu stays on the existing animation job and is not called here.
 */

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";
import { localMediaDir, safeLocalFileName } from "@/lib/studio-local-media";
import { resolveFfmpegForTextOverlay } from "@/lib/video-ffmpeg-capability";
import { getSelectedAnimationProviderId } from "@/server/video-providers";
import { MockVideoProvider } from "@/server/video-providers/mock-provider";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";

const execFileAsync = promisify(execFile);

type Failure = { error: { code: string; message: string; httpStatus: number } };

function fail(code: string, message: string, httpStatus: number): Failure {
  return { error: { code, message, httpStatus } };
}

export async function handoffSceneImageToVideo(input: {
  ownerId: string;
  projectId: string;
  sceneId: string;
  sceneImageId: string;
  forceProvider?: "mock";
}): Promise<
  | { assetId: string; url: string; created: boolean; provider: "mock"; providerJobId: string; creditsSpent: 0 }
  | Failure
> {
  const providerId = input.forceProvider ?? getSelectedAnimationProviderId();
  if (providerId !== "mock") {
    return fail(
      "paid_provider_disabled",
      "Live image-to-video stays on the existing animation job and wallet gate. It was not called.",
      409,
    );
  }

  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.ownerId },
    select: { id: true, storyboardId: true, title: true },
  });
  if (!project?.storyboardId) return fail("not_found", "Film not found.", 404);

  const image = await prisma.studioSceneImage.findFirst({
    where: {
      id: input.sceneImageId,
      status: "completed",
      scene: { id: input.sceneId, storyboardId: project.storyboardId, storyboard: { ownerId: input.ownerId } },
    },
    select: {
      id: true,
      imageUrl: true,
      scene: { select: { id: true, title: true, durationSeconds: true, order: true } },
    },
  });
  if (!image || !image.imageUrl.trim()) return fail("not_found", "Scene image not found.", 404);

  const existing = await prisma.studioLibraryAsset.findUnique({
    where: {
      ownerId_sourceKind_sourceId: {
        ownerId: input.ownerId,
        sourceKind: "scene_video",
        sourceId: image.scene.id,
      },
    },
  });
  if (existing && existing.deletedAt == null && existing.downloadUrl.trim()) {
    return {
      assetId: existing.id,
      url: existing.downloadUrl,
      created: false,
      provider: "mock",
      providerJobId: "",
      creditsSpent: 0,
    };
  }

  const provider = new MockVideoProvider();
  const job = await provider.createStartEndVideoJob({
    transitionId: image.scene.id,
    projectId: project.id,
    startImageUrl: image.imageUrl,
    endImageUrl: image.imageUrl,
    prompt: image.scene.title || project.title,
    durationSeconds: Math.max(1, image.scene.durationSeconds || 4),
    aspectRatio: "9:16",
    stylePreset: "studio",
  });

  const dir = localMediaDir();
  if (!dir) return fail("local_media", "Local media storage is not configured for this test.", 500);
  await mkdir(dir, { recursive: true });
  const seconds = Math.max(1, Math.min(4, image.scene.durationSeconds || 2));
  const filePath = path.join(dir, `scene-video-${safeLocalFileName(image.scene.id)}.mp4`);
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const color = image.scene.order % 2 === 0 ? "0x8B1E3F" : "0x1D4E89";
  await execFileAsync(ffmpeg, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=360x640:r=25:d=${seconds}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    filePath,
  ]);
  const url = pathToFileURL(filePath).href;
  const row = await upsertLibraryAsset({
    ownerId: input.ownerId,
    projectId: project.id,
    family: "video",
    category: "scene-video",
    title: `${image.scene.title || "Scene"} video`,
    description: "Mock scene video. The scene still was not replaced.",
    origin: "generated",
    previewUrl: url,
    downloadUrl: url,
    storageKey: filePath,
    mimeType: "video/mp4",
    backingStore: "local_file",
    sourceKind: "scene_video",
    sourceId: image.scene.id,
    generator: "mock",
    creditsSpent: 0,
    width: 360,
    height: 640,
    durationSeconds: seconds,
    aspectRatio: "9:16",
    metadata: {
      projectId: project.id,
      sceneId: image.scene.id,
      sceneImageId: image.id,
      provider: "mock",
      providerJobId: job.providerJobId,
    },
  });
  return { assetId: row.id, url, created: existing == null, provider: "mock", providerJobId: job.providerJobId, creditsSpent: 0 };
}
