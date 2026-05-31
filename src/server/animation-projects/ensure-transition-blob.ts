import {
  isBlobSegmentUrl,
  persistSegmentVideoToBlob,
  resolveStoredSegmentBlobUrl,
  urlIsReachableVideo,
} from "@/lib/segment-blob-storage";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/server/video-providers";

export type EnsureTransitionBlobResult =
  | { ok: true; url: string; alreadyStored: boolean }
  | { ok: false; error: string; code: "not_completed" | "no_source" | "persist_failed" };

type TransitionBlobInput = {
  id: string;
  projectId: string;
  order: number;
  status: string;
  outputVideoUrl: string | null;
  providerJobId: string | null;
};

async function resolveReachableSegmentSource(
  transition: TransitionBlobInput
): Promise<string | null> {
  const current = transition.outputVideoUrl?.trim() ?? "";
  if (current && (await urlIsReachableVideo(current))) {
    return current;
  }

  const jobId = transition.providerJobId?.trim();
  if (!jobId) {
    return null;
  }

  try {
    const provider = getVideoProvider();
    const polled = await provider.getVideoJobStatus(jobId);
    const fresh = polled.outputVideoUrl?.trim() ?? "";
    if (fresh && (await urlIsReachableVideo(fresh))) {
      return fresh;
    }
  } catch {
    return null;
  }

  return null;
}

/** Ensure a completed transition clip is stored on Vercel Blob and referenced in the DB. */
export async function ensureTransitionOutputInBlob(
  transition: TransitionBlobInput
): Promise<EnsureTransitionBlobResult> {
  if (transition.status !== "completed") {
    return { ok: false, error: "Transition is not completed.", code: "not_completed" };
  }

  const existing = transition.outputVideoUrl?.trim() ?? "";
  if (existing && isBlobSegmentUrl(existing)) {
    return { ok: true, url: existing, alreadyStored: true };
  }

  const storedBlob = await resolveStoredSegmentBlobUrl(transition.projectId, transition.order);
  if (storedBlob) {
    if (storedBlob !== existing) {
      await prisma.animationTransition.update({
        where: { id: transition.id },
        data: { outputVideoUrl: storedBlob, updatedAt: new Date() },
      });
    }
    return { ok: true, url: storedBlob, alreadyStored: true };
  }

  const sourceUrl = await resolveReachableSegmentSource(transition);
  if (!sourceUrl) {
    return {
      ok: false,
      error: "No reachable segment source URL (stored URL expired and provider refresh failed).",
      code: "no_source",
    };
  }

  try {
    const blobUrl = await persistSegmentVideoToBlob(
      transition.projectId,
      transition.order,
      sourceUrl
    );
    if (blobUrl !== existing) {
      await prisma.animationTransition.update({
        where: { id: transition.id },
        data: { outputVideoUrl: blobUrl, updatedAt: new Date() },
      });
    }
    return { ok: true, url: blobUrl, alreadyStored: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ensure-transition-blob]", {
      transitionId: transition.id,
      projectId: transition.projectId,
      segmentOrder: transition.order,
      message,
    });
    return { ok: false, error: message, code: "persist_failed" };
  }
}

export async function ensureProjectTransitionsInBlob(projectId: string): Promise<{
  attempted: number;
  stored: number;
  alreadyStored: number;
  failed: number;
  errors: Array<{ transitionId: string; order: number; error: string }>;
}> {
  const transitions = await prisma.animationTransition.findMany({
    where: { projectId, status: "completed", outputVideoUrl: { not: null } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      projectId: true,
      order: true,
      status: true,
      outputVideoUrl: true,
      providerJobId: true,
    },
  });

  let stored = 0;
  let alreadyStored = 0;
  let failed = 0;
  const errors: Array<{ transitionId: string; order: number; error: string }> = [];

  for (const transition of transitions) {
    const result = await ensureTransitionOutputInBlob(transition);
    if (result.ok) {
      if (result.alreadyStored) {
        alreadyStored += 1;
      } else {
        stored += 1;
      }
    } else {
      failed += 1;
      errors.push({
        transitionId: transition.id,
        order: transition.order,
        error: result.error,
      });
    }
  }

  return {
    attempted: transitions.length,
    stored,
    alreadyStored,
    failed,
    errors,
  };
}
