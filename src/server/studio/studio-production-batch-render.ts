/**
 * Server-side production batch render — one Motion batch per orchestrator plan slice.
 */

import { mapHandoffSceneToPersistedImage, mapHandoffSceneToPersistedText } from "@/lib/studio-motion-handoff-map";
import { mapStudioContinuityToWizardStrength, mapStudioStyleProfileToWizardPreset } from "@/lib/studio-motion-handoff-style-map";
import { resolveMotionHandoffExecutionPrefill } from "@/lib/motion-handoff-execution-prefill";
import { filterMotionHandoffBySceneIndices } from "@/lib/studio-production-handoff-filter";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import { buildMinimalProductionStudioImport } from "@/lib/studio-project-metadata";
import {
  logProductionPayloadReport,
  measureProductionPayloadReport,
} from "@/lib/studio-production-payload-size";
import {
  createInstantPremiumAnimationProject,
  validateInstantPremiumCreatePayload,
  type InstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import { startProjectJobs } from "@/server/animation-jobs/service";
import { createMotionHandoffPayload } from "@/server/studio/create-motion-handoff-payload";
import type { SessionUser } from "@/server/auth/session";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import type { InstantSceneText } from "@/lib/instant-premium-mode-types";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

function handoffImages(payload: MotionHandoffPayload): CreateAnimationProjectImageInput[] {
  const images: CreateAnimationProjectImageInput[] = [];
  for (const scene of payload.scenes) {
    const persisted = mapHandoffSceneToPersistedImage(scene);
    if (!persisted?.remoteWorkingUrl) continue;
    const url = persisted.remoteWorkingUrl;
    images.push({
      fileName: persisted.originalFileName,
      previewUrl: url,
      workingImageUrl: url,
      mimeType: persisted.mimeType,
      sizeBytes: persisted.sizeBytes,
    });
  }
  return images;
}

function buildCreatePayloadFromHandoff(payload: MotionHandoffPayload): InstantPremiumCreatePayload {
  const prefill = resolveMotionHandoffExecutionPrefill(payload);
  const images = handoffImages(payload);
  const sceneTexts = payload.scenes.map((scene) =>
    mapHandoffSceneToPersistedText(scene, prefill.transitionSeconds)
  );
  const plan = resolveInstantPremiumOutputPlan({
    imageCount: images.length,
    instantMode: prefill.instantMode,
    transitionSeconds: prefill.transitionSeconds,
  });

  return {
    images,
    title: payload.title,
    instantMode: prefill.instantMode,
    instantTransitionSeconds: prefill.transitionSeconds,
    instantSceneTexts: sceneTexts as unknown as InstantSceneText[],
    stylePreset: mapStudioStyleProfileToWizardPreset(payload.promptStyleProfile),
    duration: plan.providerDurationSeconds,
    aspectRatio: "9:16",
    userIntent: payload.description.trim() || payload.title.trim() || null,
    continuityStrength: mapStudioContinuityToWizardStrength(payload.continuityStrength),
    lockedTextMode: true,
    lockedTextLayers: [],
    studioImport: buildMinimalProductionStudioImport(payload),
  };
}

export async function renderProductionBatch(params: {
  viewer: SessionUser;
  storyboardId: string;
  sceneIndices: number[];
  batchIndex: number;
}): Promise<
  | { ok: true; projectId: string; warnings?: string[] }
  | { ok: false; error: string; code: string; httpStatus: number }
> {
  const handoffResult = await createMotionHandoffPayload(params.storyboardId, params.viewer);
  if ("error" in handoffResult) {
    return {
      ok: false,
      error: handoffResult.error.message,
      code: handoffResult.error.code,
      httpStatus: handoffResult.error.httpStatus,
    };
  }

  const filtered = filterMotionHandoffBySceneIndices(handoffResult.payload, params.sceneIndices);
  if (filtered.scenes.length === 0) {
    return { ok: false, error: "No scenes in batch", code: "NO_SCENES", httpStatus: 400 };
  }

  const createPayload = buildCreatePayloadFromHandoff(filtered);
  const sizeReport = measureProductionPayloadReport(
    `batch-${params.storyboardId}-${params.batchIndex}`,
    createPayload
  );
  logProductionPayloadReport(sizeReport);
  if (!sizeReport.withinLimits) {
    return {
      ok: false,
      error: sizeReport.violations.join("; "),
      code: "PAYLOAD_TOO_LARGE",
      httpStatus: 400,
    };
  }

  const validated = validateInstantPremiumCreatePayload(createPayload);
  if (!validated.ok) {
    return { ok: false, error: validated.error, code: "VALIDATION_ERROR", httpStatus: validated.status };
  }

  const created = await createInstantPremiumAnimationProject(params.viewer.id, validated.data);
  if (!created.ok) {
    return {
      ok: false,
      error: created.error,
      code: "CREATE_FAILED",
      httpStatus: created.status,
    };
  }

  try {
    await startProjectJobs(created.projectId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Job start failed",
      code: "JOB_START_FAILED",
      httpStatus: 500,
    };
  }

  return { ok: true, projectId: created.projectId, warnings: created.warnings };
}
