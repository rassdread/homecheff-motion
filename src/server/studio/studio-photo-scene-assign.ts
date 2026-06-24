/**
 * Assign persisted photo assets to storyboard scenes (server).
 */

import { prisma } from "@/lib/prisma";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import type { SessionUser } from "@/server/auth/session";

export async function assignPhotoUrlsToStoryboardScenes(params: {
  storyboardId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  photoUrls: string[];
}): Promise<{ ok: true; assigned: number } | { ok: false; error: string }> {
  const urls = params.photoUrls.filter((u) => u.trim());
  if (urls.length === 0) {
    return { ok: true, assigned: 0 };
  }

  const storyboard = await getStudioStoryboardById(params.storyboardId, params.viewer);
  if (!storyboard?.scenes?.length) {
    return { ok: false, error: "No scenes to assign photos" };
  }

  const sorted = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  let assigned = 0;

  for (let i = 0; i < sorted.length; i++) {
    const scene = sorted[i]!;
    const url = urls[i % urls.length]!;
    await prisma.studioSceneImage.create({
      data: {
        sceneId: scene.id,
        status: "completed",
        promptVersion: 1,
        generationVersion: 1,
        generatedPrompt: "Imported from production upload",
        imageUrl: url,
        thumbnailUrl: url,
        provider: "production_upload",
      },
    });
    assigned += 1;
  }

  return { ok: true, assigned };
}
