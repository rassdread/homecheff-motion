import { prisma } from "@/lib/prisma";
import { ensureTransitionOutputInBlob } from "@/server/animation-projects/ensure-transition-blob";
import { getVideoProvider } from "@/server/video-providers";

export { persistSegmentVideoToBlob } from "@/lib/segment-blob-storage";

export async function refreshTransitionOutputsFromProvider(projectId: string): Promise<void> {
  const transitions = await prisma.animationTransition.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  const provider = getVideoProvider();
  await Promise.all(
    transitions.map(async (tr) => {
      if (!tr.providerJobId?.trim()) {
        if (tr.status === "completed" && tr.outputVideoUrl?.trim()) {
          await ensureTransitionOutputInBlob(tr).catch(() => undefined);
        }
        return;
      }
      try {
        const polled = await provider.getVideoJobStatus(tr.providerJobId);
        if (polled.status === "completed" && polled.outputVideoUrl?.trim()) {
          await prisma.animationTransition.update({
            where: { id: tr.id },
            data: {
              status: "completed",
              progress: 100,
              outputVideoUrl: polled.outputVideoUrl.trim(),
              errorMessage: null,
            },
          });
        }
        const refreshed = await prisma.animationTransition.findUnique({ where: { id: tr.id } });
        if (refreshed?.status === "completed" && refreshed.outputVideoUrl?.trim()) {
          await ensureTransitionOutputInBlob(refreshed).catch(() => undefined);
        }
      } catch {
        if (tr.status === "completed" && tr.outputVideoUrl?.trim()) {
          await ensureTransitionOutputInBlob(tr).catch(() => undefined);
        }
      }
    })
  );
}
