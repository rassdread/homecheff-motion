import { prisma } from "@/lib/prisma";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import { pollProjectExport, startProjectExport } from "@/server/animation-export/service";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";

const ACTIVE_PROJECT_STATUSES = ["queued", "generating", "rendering"] as const;
const MAX_SYNC_PER_REQUEST = 6;

function isInstantLikeProject(project: {
  projectType?: string | null;
  stylePreset?: string | null;
  instantOutputDurationSeconds?: number | null;
  instantSelectedChips?: unknown;
  instantUserIntent?: string | null;
}): boolean {
  return (
    project.projectType === "instant_premium" ||
    project.stylePreset === "food_promo" ||
    project.stylePreset === "clean_business" ||
    project.stylePreset === "social_boost" ||
    project.instantOutputDurationSeconds != null ||
    project.instantSelectedChips != null ||
    (project.instantUserIntent?.trim().length ?? 0) > 0
  );
}

export type SyncActiveProjectResult = {
  projectId: string;
  projectType: "instant_premium" | "classic";
  ok: boolean;
  projectStatus?: string;
  hasFinalVideo?: boolean;
  error?: string;
};

export type SyncActiveProjectsSummary = {
  attempted: number;
  succeeded: number;
  newlyCompleted: number;
  results: SyncActiveProjectResult[];
};

async function syncClassicProject(projectId: string): Promise<SyncActiveProjectResult> {
  const poll = await pollProjectJobs(projectId);
  if (poll.allCompleted) {
    const project = await prisma.animationProject.findUnique({
      where: { id: projectId },
      include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const latest = project?.exports[0];
    const hasFinal =
      latest?.status === "completed" && Boolean(latest.outputVideoUrl?.trim());
    if (!hasFinal) {
      try {
        await startProjectExport(projectId);
      } catch {
        await pollProjectExport(projectId).catch(() => undefined);
      }
    } else if (project?.status !== "completed") {
      await pollProjectExport(projectId).catch(() => undefined);
    }
  } else if (poll.anyFailed) {
    // pollProjectJobs already marked project failed when appropriate
  } else {
    await pollProjectExport(projectId).catch(() => undefined);
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      exports: { orderBy: { createdAt: "desc" }, take: 1, select: { outputVideoUrl: true, status: true } },
    },
  });
  const ex = refreshed?.exports[0];
  return {
    projectId,
    projectType: "classic",
    ok: true,
    projectStatus: refreshed?.status,
    hasFinalVideo: Boolean(ex?.status === "completed" && ex.outputVideoUrl?.trim()),
  };
}

async function syncInstantProject(projectId: string): Promise<SyncActiveProjectResult> {
  await getInstantPremiumStatus(projectId);
  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      exports: { orderBy: { createdAt: "desc" }, take: 1, select: { outputVideoUrl: true, status: true } },
    },
  });
  const ex = refreshed?.exports[0];
  return {
    projectId,
    projectType: "instant_premium",
    ok: true,
    projectStatus: refreshed?.status,
    hasFinalVideo: Boolean(ex?.status === "completed" && ex.outputVideoUrl?.trim()),
  };
}

/** Poll Vidu, merge clips, and finalize exports for in-progress projects owned by the user. */
export async function syncActiveAnimationProjectsForUser(
  userId: string
): Promise<SyncActiveProjectsSummary> {
  const candidates = await prisma.animationProject.findMany({
    where: {
      ownerId: userId,
      OR: [
        { status: { in: [...ACTIVE_PROJECT_STATUSES] } },
        {
          status: "rendering",
          exports: {
            some: {
              outputVideoUrl: { not: null },
              status: { in: ["completed", "rendering", "succeeded", "done"] },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: MAX_SYNC_PER_REQUEST,
    select: {
      id: true,
      status: true,
      projectType: true,
      stylePreset: true,
      instantOutputDurationSeconds: true,
      instantSelectedChips: true,
      instantUserIntent: true,
    },
  });

  const results: SyncActiveProjectResult[] = [];
  let succeeded = 0;
  let newlyCompleted = 0;

  for (const project of candidates) {
    try {
      const result = isInstantLikeProject(project)
        ? await syncInstantProject(project.id)
        : await syncClassicProject(project.id);
      results.push(result);
      if (result.ok) {
        succeeded += 1;
        if (result.hasFinalVideo && project.status !== "completed") {
          newlyCompleted += 1;
        }
      }
    } catch (error) {
      results.push({
        projectId: project.id,
        projectType: isInstantLikeProject(project) ? "instant_premium" : "classic",
        ok: false,
        error: error instanceof Error ? error.message : "Sync failed.",
      });
    }
  }

  return {
    attempted: candidates.length,
    succeeded,
    newlyCompleted,
    results,
  };
}
