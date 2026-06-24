/**
 * Assign logo and product images to commercial storyboard scenes.
 */

import { prisma } from "@/lib/prisma";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import type { SessionUser } from "@/server/auth/session";

export async function assignCommercialAssetsToStoryboardScenes(params: {
  storyboardId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  logoUrl?: string;
  productUrls: string[];
}): Promise<{ ok: true; assigned: number } | { ok: false; error: string }> {
  const productUrls = params.productUrls.filter((u) => u.trim());
  const logoUrl = params.logoUrl?.trim();
  if (!logoUrl && productUrls.length === 0) {
    return { ok: true, assigned: 0 };
  }

  const storyboard = await getStudioStoryboardById(params.storyboardId, params.viewer);
  if (!storyboard?.scenes?.length) {
    return { ok: false, error: "No scenes for commercial assets" };
  }

  const sorted = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  let assigned = 0;

  if (logoUrl) {
    const scene = sorted[0]!;
    await prisma.studioSceneImage.create({
      data: {
        sceneId: scene.id,
        status: "completed",
        promptVersion: 1,
        generationVersion: 1,
        generatedPrompt: "Brand logo — production upload",
        imageUrl: logoUrl,
        thumbnailUrl: logoUrl,
        provider: "production_logo",
      },
    });
    assigned += 1;
  }

  const urls = productUrls.length > 0 ? productUrls : [];
  const startIndex = logoUrl ? 1 : 0;
  for (let i = startIndex; i < sorted.length; i++) {
    if (urls.length === 0) break;
    const scene = sorted[i]!;
    const url = urls[(i - startIndex) % urls.length]!;
    await prisma.studioSceneImage.create({
      data: {
        sceneId: scene.id,
        status: "completed",
        promptVersion: 1,
        generationVersion: 1,
        generatedPrompt: "Product image — production upload",
        imageUrl: url,
        thumbnailUrl: url,
        provider: "production_product",
      },
    });
    assigned += 1;
  }

  return { ok: true, assigned };
}

export function commercialAssetsPresent(orchestrator: {
  persistedAssets?: Array<{ kind: string }>;
  characterId?: string;
}): boolean {
  if (orchestrator.characterId?.trim()) {
    return true;
  }
  const assets = orchestrator.persistedAssets ?? [];
  return assets.some((a) => a.kind === "logo" || a.kind === "product_image");
}
