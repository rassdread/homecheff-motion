import { prisma } from "@/lib/prisma";
import { startTransitionJob } from "@/server/animation-jobs/service";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

type PendingSegmentRetryAudit = {
  pendingSegmentRetry?: { order: number; startedAt: string } | null;
};

function readPendingSegmentRetry(audit: unknown): number | null {
  if (!audit || typeof audit !== "object") {
    return null;
  }
  const pending = (audit as PendingSegmentRetryAudit).pendingSegmentRetry;
  return typeof pending?.order === "number" ? pending.order : null;
}

export function readPendingSegmentRetryOrder(audit: unknown): number | null {
  return readPendingSegmentRetry(audit);
}

/** Re-queue and re-run Vidu for one failed segment; completed segments are untouched. */
export async function retryInstantPremiumSegment(
  projectId: string,
  segmentOrder: number
): Promise<InstantPremiumStatusResponse> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }

  const transition = project.transitions.find((t) => t.order === segmentOrder);
  if (!transition) {
    throw new Error(`Segment ${segmentOrder + 1} not found.`);
  }
  if (transition.status !== "failed") {
    if (transition.status === "generating" || transition.status === "processing") {
      throw new Error("Segment is already rendering.");
    }
    if (transition.status === "completed" && transition.outputVideoUrl?.trim()) {
      throw new Error("Segment already completed.");
    }
    throw new Error("Only failed segments can be retried.");
  }

  const otherActive = project.transitions.some(
    (t) =>
      t.id !== transition.id &&
      (t.status === "generating" ||
        t.status === "processing" ||
        t.status === "rendering" ||
        (t.status === "queued" && Boolean(t.providerJobId?.trim())))
  );
  if (otherActive) {
    throw new Error("Another segment is still rendering. Wait until it finishes.");
  }

  const pendingOrder = readPendingSegmentRetry(project.instantFinalRebuildAuditJson);
  if (pendingOrder != null && pendingOrder !== segmentOrder) {
    throw new Error("Another segment retry is already in progress.");
  }

  const auditBase =
    project.instantFinalRebuildAuditJson &&
    typeof project.instantFinalRebuildAuditJson === "object" &&
    !Array.isArray(project.instantFinalRebuildAuditJson)
      ? (project.instantFinalRebuildAuditJson as Record<string, unknown>)
      : {};

  await prisma.$transaction([
    prisma.animationTransition.update({
      where: { id: transition.id },
      data: {
        status: "queued",
        providerJobId: null,
        outputVideoUrl: null,
        errorMessage: null,
        progress: 0,
      },
    }),
    prisma.animationProject.update({
      where: { id: projectId },
      data: {
        status: "generating",
        failureReason: null,
        lastOverlayError: null,
        instantFinalRebuildStatus: null,
        instantFinalRebuildAuditJson: {
          ...auditBase,
          pendingSegmentRetry: { order: segmentOrder, startedAt: new Date().toISOString() },
        },
      },
    }),
  ]);

  console.info("[hc-instant-premium]", {
    action: "retry_segment",
    projectId,
    segmentIndex: segmentOrder,
    transitionId: transition.id,
  });

  await startTransitionJob(transition.id);

  return getInstantPremiumStatus(projectId);
}
