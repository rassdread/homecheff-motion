/**
 * Consumes Studio planner metadata into Motion wizard / project structure.
 * Planning only — no render start.
 */

import type { InstantMode } from "@/lib/instant-premium-mode-types";
import { resolveMotionHandoffExecutionPrefill } from "@/lib/motion-handoff-execution-prefill";
import type {
  MotionExecutionConsumption,
  MotionExecutionConsumptionSummary,
  MotionExecutionImageRole,
  MotionExecutionImageSlotPlan,
  MotionExecutionReadinessItem,
  MotionExecutionRefreshDiff,
  MotionExecutionRefreshDiffItem,
  MotionExecutionTransitionUnitPlan,
} from "@/types/motion-handoff-execution-consumption";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

function expectedTransitionRowCount(imageCount: number, instantMode: InstantMode): number {
  if (instantMode === "story" && imageCount >= 2) {
    return 1;
  }
  return Math.max(0, imageCount - 1);
}

function resolveImageRole(requiredRole: string): MotionExecutionImageRole {
  if (requiredRole.includes("end")) {
    return "end";
  }
  if (requiredRole.includes("start")) {
    return "start";
  }
  return "scene";
}

function sceneStillUrl(scene: MotionHandoffPayload["scenes"][number]): string | null {
  const url = scene.selectedSceneImageUrl?.trim();
  return url || null;
}

function buildStoryImageSlots(payload: MotionHandoffPayload): MotionExecutionImageSlotPlan[] {
  return [...payload.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => {
      const url = sceneStillUrl(scene);
      return {
        slotId: scene.sceneId,
        sceneId: scene.sceneId,
        sceneOrder: scene.order,
        sceneTitle: scene.title.trim() || String(scene.order + 1),
        imageRole: "scene" as const,
        imageUrl: url,
        missing: !url,
      };
    });
}

function buildActionChainImageSlots(payload: MotionHandoffPayload): MotionExecutionImageSlotPlan[] {
  const animation = payload.animationPlan;
  const sceneById = new Map(payload.scenes.map((s) => [s.sceneId, s]));

  if (!animation || animation.scenes.length === 0) {
    return buildStoryImageSlots(payload);
  }

  const animScenes = [...animation.scenes].sort((a, b) => a.sceneOrder - b.sceneOrder);
  const multiScene = animScenes.length > 1;
  const singleSceneMultiShot =
    animScenes.length === 1 && (animScenes[0]?.shots.length ?? 0) > 1;

  if (multiScene || !singleSceneMultiShot) {
    return animScenes.map((animScene) => {
      const payloadScene = sceneById.get(animScene.sceneId);
      const title = payloadScene?.title.trim() || String(animScene.sceneOrder + 1);
      const sceneUrl = payloadScene ? sceneStillUrl(payloadScene) : null;
      const shot = animScene.shots[0];
      return {
        slotId: animScene.sceneId,
        sceneId: animScene.sceneId,
        sceneOrder: animScene.sceneOrder,
        sceneTitle: title,
        beatLabel: shot?.actionBeat,
        imageRole: "scene" as const,
        imageUrl: sceneUrl,
        missing: !sceneUrl || Boolean(shot?.missingImage),
      };
    });
  }

  const animScene = animScenes[0]!;
  const payloadScene = sceneById.get(animScene.sceneId);
  const title = payloadScene?.title.trim() || String(animScene.sceneOrder + 1);
  const sceneUrl = payloadScene ? sceneStillUrl(payloadScene) : null;
  const slots: MotionExecutionImageSlotPlan[] = [];

  for (let i = 0; i < animScene.shots.length; i++) {
    const shot = animScene.shots[i]!;
    const role = resolveImageRole(shot.requiredImageRole);
    const isFirst = i === 0;
    const url = isFirst && role !== "end" ? sceneUrl : null;
    slots.push({
      slotId: `${animScene.sceneId}:beat-${i}`,
      sceneId: animScene.sceneId,
      sceneOrder: animScene.sceneOrder,
      sceneTitle: title,
      beatLabel: shot.actionBeat,
      imageRole: role,
      imageUrl: url,
      missing: shot.missingImage || (isFirst ? !sceneUrl : true),
    });
  }

  return slots;
}

function buildHybridImageSlots(payload: MotionHandoffPayload): MotionExecutionImageSlotPlan[] {
  const exec = payload.viduExecutionPlan;
  const storySlots = buildStoryImageSlots(payload);
  if (!exec?.jobs.length) {
    return storySlots;
  }

  const slots: MotionExecutionImageSlotPlan[] = [];
  for (const job of exec.jobs) {
    if (job.jobKind.includes("story")) {
      for (const sceneId of job.sceneIds) {
        const existing = storySlots.find((s) => s.sceneId === sceneId);
        if (existing && !slots.some((s) => s.slotId === existing.slotId)) {
          slots.push(existing);
        }
      }
    } else if (job.jobKind.includes("action")) {
      const actionSlots = buildActionChainImageSlots({
        ...payload,
        animationPlan: payload.animationPlan
          ? {
              ...payload.animationPlan,
              scenes: payload.animationPlan.scenes.filter((s) => job.sceneIds.includes(s.sceneId)),
            }
          : undefined,
        scenes: payload.scenes.filter((s) => job.sceneIds.includes(s.sceneId)),
      });
      for (const slot of actionSlots) {
        if (!slots.some((s) => s.slotId === slot.slotId)) {
          slots.push(slot);
        }
      }
    }
  }

  return slots.length > 0 ? slots : storySlots;
}

function buildTransitionUnits(params: {
  payload: MotionHandoffPayload;
  instantMode: InstantMode;
  imageSlots: MotionExecutionImageSlotPlan[];
}): MotionExecutionTransitionUnitPlan[] {
  const exec = params.payload.viduExecutionPlan;
  const units: MotionExecutionTransitionUnitPlan[] = [];

  if (exec?.jobs.length) {
    for (let i = 0; i < exec.jobs.length; i++) {
      const job = exec.jobs[i]!;
      const startSlot = params.imageSlots[i] ?? params.imageSlots[0];
      const endSlot = params.imageSlots[i + 1] ?? params.imageSlots[params.imageSlots.length - 1];
      if (!startSlot || !endSlot) {
        continue;
      }
      units.push({
        unitIndex: i,
        jobId: job.id,
        beatLabels: job.beatLabels,
        durationSeconds: job.durationSeconds,
        startSlotId: startSlot.slotId,
        endSlotId: endSlot.slotId,
        missingImages: startSlot.missing || endSlot.missing || job.missingImageCount > 0,
      });
    }
    return units;
  }

  if (params.instantMode === "story" && params.imageSlots.length >= 2) {
    const first = params.imageSlots[0]!;
    const last = params.imageSlots[params.imageSlots.length - 1]!;
    units.push({
      unitIndex: 0,
      jobId: null,
      beatLabels: params.imageSlots.map((s) => s.sceneTitle),
      durationSeconds:
        params.payload.animationPlan?.totalTargetDuration ??
        params.payload.viduExecutionPlan?.estimatedDurationSeconds ??
        0,
      startSlotId: first.slotId,
      endSlotId: last.slotId,
      missingImages: params.imageSlots.some((s) => s.missing),
    });
    return units;
  }

  for (let i = 0; i < params.imageSlots.length - 1; i++) {
    const start = params.imageSlots[i]!;
    const end = params.imageSlots[i + 1]!;
    units.push({
      unitIndex: i,
      jobId: null,
      beatLabels: [start.beatLabel ?? start.sceneTitle, end.beatLabel ?? end.sceneTitle],
      durationSeconds:
        params.payload.animationPlan?.scenes.find((s) => s.sceneId === start.sceneId)
          ?.targetDuration ?? 5,
      startSlotId: start.slotId,
      endSlotId: end.slotId,
      missingImages: start.missing || end.missing,
    });
  }

  return units;
}

function countSegments(payload: MotionHandoffPayload): {
  storySegmentCount: number;
  actionSegmentCount: number;
} {
  const exec = payload.viduExecutionPlan;
  if (!exec?.jobs.length) {
    const mode = exec?.executionMode ?? payload.renderStrategyPlan?.recommendedStrategy;
    if (mode === "action_chain") {
      return { storySegmentCount: 0, actionSegmentCount: payload.scenes.length };
    }
    return { storySegmentCount: payload.scenes.length, actionSegmentCount: 0 };
  }

  let storySegmentCount = 0;
  let actionSegmentCount = 0;
  for (const job of exec.jobs) {
    if (job.jobKind.includes("story")) {
      storySegmentCount += 1;
    } else if (job.jobKind.includes("action")) {
      actionSegmentCount += 1;
    }
  }
  return { storySegmentCount, actionSegmentCount };
}

function buildReadinessItems(
  consumption: Omit<
    MotionExecutionConsumption,
    "readinessItems" | "metadataAvailable"
  >
): MotionExecutionReadinessItem[] {
  const items: MotionExecutionReadinessItem[] = [
    {
      id: "approach",
      labelKey: "motion.handoff.executionConsumption.readiness.approach",
      status: consumption.executionMode ? "ok" : "warn",
    },
    {
      id: "images",
      labelKey: "motion.handoff.executionConsumption.readiness.images",
      status:
        consumption.imageSlots.every((s) => !s.missing) ? "ok"
        : consumption.imageSlots.some((s) => !s.missing) ? "warn"
        : "missing",
    },
    {
      id: "duration",
      labelKey: "motion.handoff.executionConsumption.readiness.duration",
      status: consumption.totalDurationSeconds > 0 ? "ok" : "warn",
    },
    {
      id: "actions",
      labelKey: "motion.handoff.executionConsumption.readiness.actions",
      status: consumption.actionSegmentCount > 0 ? "ok" : "warn",
    },
    {
      id: "jobs",
      labelKey: "motion.handoff.executionConsumption.readiness.jobs",
      status: consumption.jobCountMismatch ? "warn" : "ok",
    },
    {
      id: "fallback",
      labelKey: "motion.handoff.executionConsumption.readiness.fallback",
      status: consumption.fallbackActive ? "warn" : "ok",
    },
  ];

  if (consumption.executionMode === "story_video") {
    return items.filter((i) => i.id !== "actions");
  }
  if (consumption.executionMode === "action_chain" && consumption.actionSegmentCount === 0) {
    return items.filter((i) => i.id !== "actions");
  }
  return items;
}

/**
 * Resolve full execution consumption from handoff payload.
 */
export function resolveMotionHandoffExecutionConsumption(
  payload: MotionHandoffPayload,
  options?: { instantMode?: InstantMode }
): MotionExecutionConsumption {
  const prefill = resolveMotionHandoffExecutionPrefill(payload);
  const instantMode = options?.instantMode ?? prefill.instantMode;
  const executionMode = prefill.executionMode;
  const metadataAvailable = prefill.metadataAvailable;

  let imageSlots: MotionExecutionImageSlotPlan[];
  if (executionMode === "action_chain") {
    imageSlots = buildActionChainImageSlots(payload);
  } else if (executionMode === "hybrid") {
    imageSlots = buildHybridImageSlots(payload);
  } else {
    imageSlots = buildStoryImageSlots(payload);
  }

  const presentSlots = imageSlots.filter((s) => s.imageUrl && !s.missing);
  const wizardImageCount = Math.max(
    presentSlots.length,
    payload.scenes.filter((s) => s.selectedSceneImageUrl?.trim()).length
  );

  const transitionUnits = buildTransitionUnits({ payload, instantMode, imageSlots });
  const { storySegmentCount, actionSegmentCount } = countSegments(payload);
  const plannedJobCount = payload.viduExecutionPlan?.totalJobCount ?? transitionUnits.length;
  const expectedRows = expectedTransitionRowCount(wizardImageCount, instantMode);
  const jobCountMismatch =
    metadataAvailable &&
    plannedJobCount > 0 &&
    expectedRows !== plannedJobCount &&
    instantMode === "transition";

  const exec = payload.viduExecutionPlan;

  const base = {
    instantMode,
    executionMode,
    imageSlots,
    transitionUnits,
    expectedTransitionRowCount: expectedRows,
    plannedJobCount,
    jobCountMismatch,
    jobCountMismatchWarningKey: jobCountMismatch
      ? "motion.handoff.executionConsumption.warning.jobCountMismatch"
      : null,
    storySegmentCount,
    actionSegmentCount,
    totalDurationSeconds: prefill.totalDurationSeconds,
    transitionSeconds: prefill.transitionSeconds,
    fallbackActive: prefill.fallbackActive,
    readyToRender: prefill.readyToRender,
  };

  return {
    metadataAvailable,
    ...base,
    readinessItems: buildReadinessItems(base),
  };
}

export function toMotionExecutionConsumptionSummary(
  consumption: MotionExecutionConsumption
): MotionExecutionConsumptionSummary {
  const presentImageCount = consumption.imageSlots.filter((s) => s.imageUrl && !s.missing).length;
  const missingImageCount = consumption.imageSlots.filter((s) => s.missing).length;

  return {
    executionMode: consumption.executionMode,
    instantMode: consumption.instantMode,
    imageSlotCount: consumption.imageSlots.length,
    presentImageCount,
    missingImageCount,
    transitionUnitCount: consumption.transitionUnits.length,
    expectedTransitionRowCount: consumption.expectedTransitionRowCount,
    plannedJobCount: consumption.plannedJobCount,
    jobCountMismatch: consumption.jobCountMismatch,
    storySegmentCount: consumption.storySegmentCount,
    actionSegmentCount: consumption.actionSegmentCount,
    totalDurationSeconds: consumption.totalDurationSeconds,
    readyToRender: consumption.readyToRender,
    fallbackActive: consumption.fallbackActive,
    consumedAt: new Date().toISOString(),
  };
}

export function computeExecutionRefreshDiff(
  previous: MotionExecutionConsumptionSummary | null | undefined,
  next: MotionExecutionConsumptionSummary
): MotionExecutionRefreshDiff {
  if (!previous) {
    return { hasChanges: false, items: [] };
  }

  const items: MotionExecutionRefreshDiffItem[] = [];

  if (previous.plannedJobCount !== next.plannedJobCount) {
    items.push({
      id: "job-count",
      kind: "job_count",
      labelKey: "motion.handoff.executionConsumption.refreshDiff.jobCount",
      before: String(previous.plannedJobCount),
      after: String(next.plannedJobCount),
    });
  }

  if (previous.totalDurationSeconds !== next.totalDurationSeconds) {
    items.push({
      id: "duration",
      kind: "duration",
      labelKey: "motion.handoff.executionConsumption.refreshDiff.duration",
      before: String(previous.totalDurationSeconds),
      after: String(next.totalDurationSeconds),
    });
  }

  if (previous.instantMode !== next.instantMode) {
    items.push({
      id: "mode",
      kind: "mode",
      labelKey: "motion.handoff.executionConsumption.refreshDiff.mode",
      before: previous.instantMode,
      after: next.instantMode,
    });
  }

  if (next.presentImageCount > previous.presentImageCount) {
    items.push({
      id: "new-images",
      kind: "new_image",
      labelKey: "motion.handoff.executionConsumption.refreshDiff.newImages",
      labelParams: { count: String(next.presentImageCount - previous.presentImageCount) },
    });
  }

  if (next.transitionUnitCount > previous.transitionUnitCount) {
    items.push({
      id: "new-shots",
      kind: "new_shot",
      labelKey: "motion.handoff.executionConsumption.refreshDiff.newShots",
      labelParams: { count: String(next.transitionUnitCount - previous.transitionUnitCount) },
    });
  }

  return { hasChanges: items.length > 0, items };
}

/** Map consumption image slots onto wizard slot images (scene stills only — no auto-upload). */
export function applyConsumptionImageSlotsToSceneSlots<
  T extends { sceneId: string; image: import("@/lib/instant-premium-wizard-storage").PersistedWizardImage | null },
>(
  sceneSlots: T[],
  consumption: MotionExecutionConsumption,
  mapSceneToImage: (sceneId: string) => import("@/lib/instant-premium-wizard-storage").PersistedWizardImage | null
): T[] {
  if (!consumption.metadataAvailable) {
    return sceneSlots;
  }

  const sceneStillById = new Map<string, MotionExecutionImageSlotPlan>();
  for (const slot of consumption.imageSlots) {
    if (slot.imageRole === "scene" && slot.imageUrl && !sceneStillById.has(slot.sceneId)) {
      sceneStillById.set(slot.sceneId, slot);
    }
  }

  return sceneSlots.map((slot) => {
    const plan = sceneStillById.get(slot.sceneId);
    if (!plan || !plan.imageUrl) {
      return slot;
    }
    if (slot.image && slot.image.imageSource !== "studio") {
      return slot;
    }
    const mapped = mapSceneToImage(slot.sceneId);
    return mapped ? { ...slot, image: mapped } : slot;
  });
}
