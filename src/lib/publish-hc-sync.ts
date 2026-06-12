/**
 * Publish ↔ HC continuity — store publish project snapshot in HC package.
 */

import { mergeHomeCheffProject } from "@/lib/homecheff-project-build";
import { storePublishChangePlanInHc, storeStudioWorkflowInHc, writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import type { PublishChangePlan } from "@/lib/publish-change-plan";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { PublishProject } from "@/types/publish-overlay";

export type PublishHcExportSnapshot = {
  exportUrl?: string;
  exportedAt: string;
  workflow: string;
  renderMode?: string;
};

export function syncPublishProjectToHc(
  hcProject: HomeCheffProjectPackage,
  publishProject: PublishProject,
  options?: { changePlan?: PublishChangePlan | null; exportSnapshot?: PublishHcExportSnapshot }
): HomeCheffProjectPackage {
  let next = mergeHomeCheffProject(hcProject, {
    targetService: "publish",
    servicePayload: {
      ...hcProject.servicePayload,
      publish: {
        ...hcProject.servicePayload.publish,
        publishIntent: publishProject.publishIntent,
        videoUrl: publishProject.videoUrl,
        imageUrls: publishProject.imageUrls ?? (publishProject.imageUrl ? [publishProject.imageUrl] : undefined),
        mediaKind: publishProject.mediaKind,
        publishPrompt: publishProject.publishIntent,
        projectSnapshot: {
          id: publishProject.id,
          name: publishProject.name,
          workflow: publishProject.workflow,
          durationSeconds: publishProject.durationSeconds,
          overlays: publishProject.overlays,
          subtitles: publishProject.subtitles,
          metadata: {
            ...publishProject.metadata,
            overlayCount: publishProject.overlays.length,
            subtitleCount: publishProject.subtitles.length,
          },
          updatedAt: publishProject.updatedAt,
        },
        metadata: {
          ...hcProject.servicePayload.publish?.metadata,
          lastExport: options?.exportSnapshot,
        },
      },
    },
    handoffHistory: [
      ...hcProject.handoffHistory,
      {
        id: `handoff_publish_${Date.now()}`,
        sourceService: "publish",
        targetService: hcProject.targetService ?? "publish",
        handoffType: "publish_sync",
        payload: { publishProjectId: publishProject.id, workflow: publishProject.workflow },
        createdAt: new Date().toISOString(),
      },
    ],
  });

  next = writeHcWorkflowV2(next, {
    publish: {
      phase: options?.exportSnapshot ? "generate" : "approve",
      intent: publishProject.publishIntent,
      analysisComplete: Boolean(publishProject.metadata?.publishAnalysisComplete),
      changePlanId: options?.changePlan?.projectId ?? publishProject.id,
    },
  });

  if (options?.changePlan) {
    next = storePublishChangePlanInHc(next, options.changePlan);
  }

  return next;
}

export function syncPublishExportToHc(
  hcProject: HomeCheffProjectPackage,
  publishProject: PublishProject,
  exportUrl?: string
): HomeCheffProjectPackage {
  return syncPublishProjectToHc(hcProject, publishProject, {
    exportSnapshot: {
      exportUrl,
      exportedAt: new Date().toISOString(),
      workflow: publishProject.workflow ?? "unknown",
      renderMode: publishProject.metadata?.renderMode as string | undefined,
    },
  });
}
