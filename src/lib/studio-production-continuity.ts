/**
 * HC Project continuity — every stage writes back orchestrator + service payload.
 */

import { readOrchestratorState, writeOrchestratorState } from "@/lib/studio-production-orchestrator";
import { defaultPublishMusicConfig, defaultPublishProductionConfig, PUBLISH_PRODUCTION_METADATA_KEY } from "@/lib/publish-media-production";
import { writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type {
  HcProductionLifecycleState,
  ProductionExecutionState,
  ProductionTransaction,
} from "@/types/studio-video-production";

export function writeProductionLifecycle(
  project: HomeCheffProjectPackage,
  lifecycle: HcProductionLifecycleState
): HomeCheffProjectPackage {
  return writeOrchestratorState(project, { lifecycle });
}

export function writeProductionExecution(
  project: HomeCheffProjectPackage,
  execution: ProductionExecutionState
): HomeCheffProjectPackage {
  let next = writeOrchestratorState(project, {
    productionExecution: execution,
    lifecycle: execution.lifecycle,
    runPhase:
      execution.lifecycle === "rendering" ? "rendering_video"
      : execution.lifecycle === "merging" ? "merging_video"
      : execution.lifecycle === "finishing" ? "finalizing_video"
      : execution.lifecycle === "completed" ? "completed"
      : undefined,
    status:
      execution.lifecycle === "rendering" ? "rendering"
      : execution.lifecycle === "merging" ? "merging"
      : execution.lifecycle === "finishing" ? "publishing"
      : execution.lifecycle === "completed" ? "completed"
      : undefined,
  });
  if (execution.mergedVideoUrl) {
    next = writeOrchestratorState(next, {
      finalVideoUrl: execution.mergedVideoUrl,
    });
    if (execution.lifecycle === "completed") {
      next = writeOrchestratorState(next, { userPhase: "finish", status: "completed" });
    }
  }
  return next;
}

export function writeProductionTransaction(
  project: HomeCheffProjectPackage,
  transaction: ProductionTransaction
): HomeCheffProjectPackage {
  return writeOrchestratorState(project, {
    productionTransaction: transaction,
    workflowReservation: {
      id: transaction.id,
      reservationId: transaction.reservationId,
      hcProjectId: transaction.hcProjectId,
      intent: transaction.intent,
      phase: transaction.phase,
      analysisCredits: transaction.analysisCredits,
      renderCredits: transaction.renderCredits,
      publishCredits: transaction.publishCredits,
      totalCredits: transaction.totalCredits,
      storyboardId: transaction.storyboardId,
      motionProjectId: transaction.motionProjectId,
      publishProjectId: transaction.publishProjectId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    },
  });
}

export function syncRenderedVideoToHcProject(params: {
  project: HomeCheffProjectPackage;
  videoUrl: string;
  motionProjectId?: string;
  storyboardId?: string;
  durationSeconds?: number;
}): HomeCheffProjectPackage {
  const orchestrator = readOrchestratorState(params.project);
  const musicUrl = orchestrator?.musicAudioUrl?.trim();

  let next = writeOrchestratorState(params.project, {
    finalVideoUrl: params.videoUrl,
    motionProjectId: params.motionProjectId,
    storyboardId: params.storyboardId ?? readStoryboardId(params.project),
    lifecycle: "finishing",
    userPhase: "finish",
    status: "publishing",
    runPhase: "finalizing_video",
  });
  next = {
    ...next,
    servicePayload: {
      ...next.servicePayload,
      publish: {
        ...next.servicePayload.publish,
        videoUrl: params.videoUrl,
        mediaKind: "video",
        metadata: {
          ...(next.servicePayload.publish?.metadata ?? {}),
          motionProjectId: params.motionProjectId,
          storyboardId: params.storyboardId,
          durationSeconds: params.durationSeconds,
          source: "studio_production",
        },
      },
      motion: {
        ...next.servicePayload.motion,
        motionProjectId: params.motionProjectId ?? next.servicePayload.motion?.motionProjectId,
        generatedVideoUrl: params.videoUrl,
      },
    },
    updatedAt: new Date().toISOString(),
  };
  if (musicUrl) {
    const existingMeta = (next.servicePayload.publish?.metadata ?? {}) as Record<string, unknown>;
    const rawProduction = existingMeta[PUBLISH_PRODUCTION_METADATA_KEY];
    const production =
      rawProduction && typeof rawProduction === "object"
        ? { ...defaultPublishProductionConfig(), ...(rawProduction as Record<string, unknown>) }
        : defaultPublishProductionConfig();
    next = {
      ...next,
      servicePayload: {
        ...next.servicePayload,
        publish: {
          ...next.servicePayload.publish,
          videoUrl: params.videoUrl,
          metadata: {
            ...existingMeta,
            [PUBLISH_PRODUCTION_METADATA_KEY]: {
              ...production,
              music: {
                ...defaultPublishMusicConfig(),
                ...production.music,
                mode: "upload",
                trackUrl: musicUrl,
                label: "Production music",
                durationMatch: true,
              },
            },
          },
        },
      },
    };
  }

  return next;
}

export function markHcProductionFailed(
  project: HomeCheffProjectPackage,
  errorMessage: string
): HomeCheffProjectPackage {
  return writeOrchestratorState(project, {
    lifecycle: "failed",
    status: "failed",
    runPhase: undefined,
    productionError: errorMessage.slice(0, 500),
  });
}

function readStoryboardId(project: HomeCheffProjectPackage): string | undefined {
  const wf = project.workflowState.aiWorkflowV2 as { orchestrator?: { storyboardId?: string } } | undefined;
  return wf?.orchestrator?.storyboardId;
}

export function markHcProductionCompleted(
  project: HomeCheffProjectPackage,
  finalVideoUrl: string
): HomeCheffProjectPackage {
  return writeOrchestratorState(
    writeHcWorkflowV2(project, {}),
    {
      finalVideoUrl,
      lifecycle: "completed",
      userPhase: "finish",
      status: "completed",
      runPhase: "completed",
      completedAt: new Date().toISOString(),
    }
  );
}
