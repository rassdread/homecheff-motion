import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

function looksLikeVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return (
      host.endsWith(".public.blob.vercel-storage.com") || host.includes("blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

/**
 * When `ANIMATION_DELETE_TRANSITION_BLOBS_AFTER_FINAL=true`, best-effort delete of transition
 * `outputVideoUrl` values that point at our Vercel Blob store. Skips external (e.g. Vidu) URLs.
 * Final export URL and image thumbnails are not passed here.
 */
export async function maybeDeleteTransitionBlobVideosAfterFinalExport(projectId: string): Promise<void> {
  if (process.env.ANIMATION_DELETE_TRANSITION_BLOBS_AFTER_FINAL?.trim() !== "true") {
    return;
  }

  const transitions = await prisma.animationTransition.findMany({
    where: { projectId },
    select: { outputVideoUrl: true },
  });

  for (const t of transitions) {
    const url = t.outputVideoUrl?.trim();
    if (!url || !looksLikeVercelBlobUrl(url)) {
      continue;
    }
    try {
      await del(url);
    } catch {
      /* non-fatal: URL may be non-Blob or already removed */
    }
  }
}
