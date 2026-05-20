import { prisma } from "@/lib/prisma";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import { getVideoProvider } from "@/server/video-providers";

export async function persistSegmentVideoToBlob(
  projectId: string,
  segmentOrder: number,
  sourceUrl: string
): Promise<string> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("Missing segment URL.");
  }
  if (trimmed.includes(".public.blob.vercel-storage.com/")) {
    return trimmed;
  }
  const response = await fetch(trimmed, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Could not download segment URL ${trimmed} (HTTP ${response.status})`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (!body || body.length <= 0) {
    throw new Error(`Downloaded empty segment for ${trimmed}`);
  }
  const uploadTarget = `motion/segments/${projectId}/segment-${segmentOrder + 1}.mp4`;
  const { url } = await uploadPublicBlob({
    pathname: uploadTarget,
    body,
    contentType: "video/mp4",
    addRandomSuffix: false,
    context: {
      projectId,
      uploadTarget,
      provider: "instant-segment-sync",
    },
  });
  return url;
}

export async function refreshTransitionOutputsFromProvider(projectId: string): Promise<void> {
  const transitions = await prisma.animationTransition.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const provider = getVideoProvider();
  await Promise.all(
    transitions.map(async (tr) => {
      if (!tr.providerJobId?.trim()) {
        return;
      }
      try {
        const polled = await provider.getVideoJobStatus(tr.providerJobId);
        if (polled.status === "completed" && polled.outputVideoUrl?.trim()) {
          let stableUrl = polled.outputVideoUrl.trim();
          try {
            stableUrl = await persistSegmentVideoToBlob(projectId, tr.order, stableUrl);
          } catch {
            // keep provider URL as fallback if blob sync fails
          }
          await prisma.animationTransition.update({
            where: { id: tr.id },
            data: {
              status: "completed",
              progress: 100,
              outputVideoUrl: stableUrl,
              errorMessage: null,
            },
          });
        } else if (tr.status === "completed" && tr.outputVideoUrl?.trim()) {
          let stableUrl = tr.outputVideoUrl.trim();
          try {
            stableUrl = await persistSegmentVideoToBlob(projectId, tr.order, stableUrl);
          } catch {
            return;
          }
          if (stableUrl !== tr.outputVideoUrl.trim()) {
            await prisma.animationTransition.update({
              where: { id: tr.id },
              data: { outputVideoUrl: stableUrl, updatedAt: new Date() },
            });
          }
        }
      } catch {
        // best effort only
      }
    })
  );
}
