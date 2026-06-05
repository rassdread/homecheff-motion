import { prisma } from "@/lib/prisma";
import { RENDER_CANCELLED_BY_USER_MESSAGE } from "@/lib/render-activity-messages";
import {
  isCancellableExportStatus,
  isCancellableProjectStatus,
  isCancellableTransitionStatus,
} from "@/lib/render-activity-status";
import {
  summarizeCancelCredits,
  type CancelCreditSummary,
} from "@/lib/render-cancel-credits";
import { isCompletedStatusToken } from "@/lib/project-display-status";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import { toProjectSnapshotResponse } from "@/server/animation-projects/project-snapshot";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/instant-premium-provider-sync";
import {
  getInstantPremiumStatus,
  recoverExistingInstantProject,
  retryInstantPremiumMerge,
} from "@/server/instant-premium/status-service";
import { startProjectJobs } from "@/server/animation-jobs/service";
import { retryProjectExport } from "@/server/animation-export/service";
import { markFullRerenderFailedIfRunning } from "@/server/instant-premium/full-rerender-project";
import { finalizeCancelledCostEventsForProject } from "@/server/provider-cost/finalize-cancelled-cost-events";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type ProjectRenderActionResult = {
  ok: boolean;
  projectId: string;
  projectStatus: string;
  message?: string;
  providerCancelAttempted: boolean;
  providerCancelSupported: boolean;
  credits?: CancelCreditSummary;
  status?: InstantPremiumStatusResponse;
  repaired?: Record<string, unknown>;
};

function isInstantLikeProject(project: {
  projectType: string;
  stylePreset: string | null;
  instantOutputDurationSeconds: number | null;
}): boolean {
  return (
    project.projectType === "instant_premium" ||
    project.stylePreset === "food_promo" ||
    project.stylePreset === "clean_business" ||
    project.stylePreset === "social_boost" ||
    project.instantOutputDurationSeconds != null
  );
}

function exportHasPlayableOutput(exp: { status: string; outputVideoUrl: string | null }): boolean {
  return Boolean(exp.outputVideoUrl?.trim()) && isCompletedStatusToken(exp.status);
}

/**
 * Cancel an in-progress render/generation for a project.
 * Does not modify source projects or completed export URLs.
 */
export async function cancelProjectRender(
  projectId: string,
  options: { forceLocal?: boolean } = {}
): Promise<ProjectRenderActionResult> {
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  if (!isCancellableProjectStatus(project.status)) {
    throw new Error("Project is not in a cancellable render state.");
  }

  const activeTransitions = project.transitions.filter((tr) =>
    isCancellableTransitionStatus(tr.status)
  );
  const providerJobIds = activeTransitions
    .map((tr) => tr.providerJobId?.trim())
    .filter((id): id is string => Boolean(id));

  const providerCancelSupported = false;
  let providerCancelAttempted = false;
  if (providerJobIds.length > 0 && !options.forceLocal) {
    providerCancelAttempted = true;
    console.info("[render-cancel] provider cancel not supported; marking local cancelled", {
      projectId,
      providerJobIds,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const tr of activeTransitions) {
      await tx.animationTransition.update({
        where: { id: tr.id },
        data: {
          status: "cancelled",
          errorMessage: RENDER_CANCELLED_BY_USER_MESSAGE,
          progress: tr.progress,
        },
      });
    }

    for (const exp of project.exports) {
      if (exportHasPlayableOutput(exp)) {
        continue;
      }
      if (!isCancellableExportStatus(exp.status)) {
        continue;
      }
      await tx.animationExport.update({
        where: { id: exp.id },
        data: {
          status: "failed",
          errorMessage: RENDER_CANCELLED_BY_USER_MESSAGE,
          progress: 0,
          providerJobId: null,
        },
      });
    }

    await tx.animationProject.update({
      where: { id: projectId },
      data: { status: "cancelled" },
    });
  });

  await markFullRerenderFailedIfRunning(projectId, RENDER_CANCELLED_BY_USER_MESSAGE).catch(
    () => undefined
  );

  const costRows = await finalizeCancelledCostEventsForProject(projectId, providerJobIds);
  const credits = summarizeCancelCredits(costRows);

  const fresh = await getAnimationProjectById(projectId);
  if (!fresh) {
    throw new Error("Project not found.");
  }

  return {
    ok: true,
    projectId,
    projectStatus: fresh.status,
    message: RENDER_CANCELLED_BY_USER_MESSAGE,
    providerCancelAttempted,
    providerCancelSupported,
    credits,
  };
}

export async function retryProjectRender(projectId: string): Promise<ProjectRenderActionResult> {
  const project = await getAnimationProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  if (isInstantLikeProject(project)) {
    const allSegmentsDone = project.transitions.every(
      (tr) => tr.status === "completed" || Boolean(tr.outputVideoUrl?.trim())
    );
    const hasFinal = project.exports.some((ex) => exportHasPlayableOutput(ex));

    if (allSegmentsDone && !hasFinal) {
      await retryInstantPremiumMerge(projectId).catch(async () => {
        await recoverExistingInstantProject(projectId, { force: true });
      });
    } else {
      await recoverExistingInstantProject(projectId, { force: true });
    }

    const status = await getInstantPremiumStatus(projectId);
    return {
      ok: true,
      projectId,
      projectStatus: status.status,
      providerCancelAttempted: false,
      providerCancelSupported: false,
      status,
    };
  }

  const allCompleted =
    project.transitions.length > 0 &&
    project.transitions.every((tr) => tr.status === "completed");
  if (allCompleted) {
    await retryProjectExport(projectId);
  } else {
    await startProjectJobs(projectId);
  }

  const fresh = await getAnimationProjectById(projectId);
  if (!fresh) {
    throw new Error("Project not found.");
  }

  return {
    ok: true,
    projectId,
    projectStatus: fresh.status,
    providerCancelAttempted: false,
    providerCancelSupported: false,
  };
}

export async function repairProjectStatus(projectId: string): Promise<ProjectRenderActionResult> {
  const before = await getAnimationProjectById(projectId);
  if (!before) {
    throw new Error("Project not found.");
  }

  await refreshTransitionOutputsFromProvider(projectId).catch(() => undefined);
  await pollProjectJobs(projectId).catch(() => undefined);

  const afterPoll = await getAnimationProjectById(projectId);
  if (!afterPoll) {
    throw new Error("Project not found.");
  }

  const allTransitionsDone =
    afterPoll.transitions.length > 0 &&
    afterPoll.transitions.every(
      (tr) =>
        tr.status === "completed" ||
        tr.status === "failed" ||
        tr.status === "cancelled" ||
        Boolean(tr.outputVideoUrl?.trim())
    );
  const playableExport = afterPoll.exports.find((ex) => exportHasPlayableOutput(ex));

  if (playableExport && afterPoll.status !== "completed" && afterPoll.status !== "cancelled") {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "completed" },
    });
  } else if (
    allTransitionsDone &&
    !playableExport &&
    afterPoll.status === "generating" &&
    afterPoll.transitions.every((tr) => tr.status === "completed")
  ) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "rendering" },
    });
  }

  const fresh = await getAnimationProjectById(projectId);
  const status = isInstantLikeProject(before) ?
    await getInstantPremiumStatus(projectId).catch(() => null)
  : null;

  return {
    ok: true,
    projectId,
    projectStatus: fresh?.status ?? before.status,
    providerCancelAttempted: false,
    providerCancelSupported: false,
    status: status ?? undefined,
    repaired: {
      beforeStatus: before.status,
      afterStatus: fresh?.status,
      transitionStatuses: fresh?.transitions.map((tr) => ({
        order: tr.order,
        status: tr.status,
        providerJobId: tr.providerJobId,
      })),
      latestExportStatus: fresh?.exports[0]?.status ?? null,
      hasPlayableExport: Boolean(playableExport),
    },
  };
}

export async function refreshProjectProviderStatus(
  projectId: string
): Promise<ProjectRenderActionResult> {
  await refreshTransitionOutputsFromProvider(projectId);
  await pollProjectJobs(projectId).catch(() => undefined);

  const fresh = await getAnimationProjectById(projectId);
  if (!fresh) {
    throw new Error("Project not found.");
  }

  const status = isInstantLikeProject(fresh) ?
    await getInstantPremiumStatus(projectId)
  : undefined;

  return {
    ok: true,
    projectId,
    projectStatus: fresh.status,
    providerCancelAttempted: false,
    providerCancelSupported: false,
    status,
    repaired: {
      transitions: fresh.transitions.map((tr) => ({
        order: tr.order,
        status: tr.status,
        providerJobId: tr.providerJobId,
        progress: tr.progress,
      })),
    },
  };
}

export function projectRenderActionSnapshot(projectId: string) {
  return getAnimationProjectById(projectId).then((p) =>
    p ? toProjectSnapshotResponse(p) : null
  );
}
