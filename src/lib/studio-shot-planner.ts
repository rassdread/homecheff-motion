/**
 * Studio V2 — unified shot planner layer.
 * Wraps buildAutoShotPlan, buildAiDirectorDirection, story flow, and motion planning.
 */

import {
  buildAiDirectorDirection,
  planFromCurrentScenes,
  type AiDirectorDirection,
} from "@/lib/studio-ai-director-direction";
import type { AiDirectorStyleStrength } from "@/lib/studio-ai-director-interpreter";
import { buildAutoShotPlan, type ShotPlanRecommendation } from "@/lib/studio-auto-shot-planner";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import {
  resolveSceneShotType,
  type StudioCameraMovement,
  type StudioSceneEnergy,
  type StudioShotType,
} from "@/lib/studio-scene-director";
import { detectArcPhaseForIndex, type StoryArcPhase } from "@/lib/studio-story-arc";
import {
  analyzeStoryFlow,
  computeShotDiversityScore,
  type StoryFlowSceneInput,
} from "@/lib/studio-story-flow-analyzer";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  SceneShotPlan,
  ShotBeat,
  ShotBeatRole,
  ShotPlanConsistencyAdvice,
  ShotPlanContinuityInsight,
  ShotPlanReadiness,
  StoryboardShotPlan,
} from "@/types/studio-shot-planner";

export type ShotPlannerSceneInput = StoryFlowSceneInput & {
  description?: string;
  action?: string;
  emotion?: string;
  durationSeconds?: number;
};

export { buildAutoShotPlan, buildAiDirectorDirection, planFromCurrentScenes, storyboardToFlowInput };
export type { ShotPlanRecommendation, AiDirectorDirection };

const FRAMING_LADDER: StudioShotType[] = [
  "extreme_wide",
  "wide",
  "medium_wide",
  "medium",
  "medium_close_up",
  "close_up",
  "extreme_close_up",
];

const CLOSE_SHOTS = new Set<StudioShotType>([
  "medium_close_up",
  "close_up",
  "extreme_close_up",
  "detail_shot",
]);

const WIDE_SHOTS = new Set<StudioShotType>(["extreme_wide", "wide", "medium_wide", "drone"]);

const DETAIL_KEYWORDS =
  /\b(detail|close|hand|hands|texture|ingredient|product|macro|finish|result|eindresultaat)\b/i;

function stepFraming(shot: StudioShotType, delta: number): StudioShotType {
  const idx = FRAMING_LADDER.indexOf(shot);
  if (idx < 0) {
    return delta < 0 ? "wide" : "close_up";
  }
  const next = Math.max(0, Math.min(FRAMING_LADDER.length - 1, idx + delta));
  return FRAMING_LADDER[next]!;
}

function openingShotForPhase(focusShot: StudioShotType, phase: StoryArcPhase): StudioShotType {
  if (phase === "opening" || phase === "discovery") {
    return stepFraming(focusShot, -2);
  }
  if (phase === "outro" || phase === "resolution") {
    return stepFraming(focusShot, -1);
  }
  return stepFraming(focusShot, -1);
}

function closingShotForPhase(focusShot: StudioShotType, phase: StoryArcPhase): StudioShotType {
  if (phase === "climax" || phase === "resolution" || phase === "outro") {
    return stepFraming(focusShot, 1);
  }
  if (phase === "opening") {
    return focusShot;
  }
  return stepFraming(focusShot, 1);
}

function focusLabel(scene: ShotPlannerSceneInput): string {
  const action = scene.action?.trim();
  if (action) {
    return action;
  }
  const title = scene.title?.trim();
  if (title) {
    return title;
  }
  return scene.description?.trim().slice(0, 120) ?? "";
}

function shouldIncludeDetailBeat(scene: ShotPlannerSceneInput, phase: StoryArcPhase): boolean {
  const text = `${scene.action ?? ""} ${scene.description ?? ""} ${scene.title ?? ""}`;
  if (DETAIL_KEYWORDS.test(text)) {
    return true;
  }
  return phase === "build_up" || phase === "climax";
}

function beatMovement(
  role: ShotBeatRole,
  base: StudioCameraMovement,
  phase: StoryArcPhase
): StudioCameraMovement {
  if (role === "opening") {
    return phase === "opening" || phase === "discovery" ? "push_in" : base;
  }
  if (role === "closing") {
    return phase === "resolution" || phase === "outro" ? "pull_out" : base;
  }
  if (role === "detail") {
    return "static";
  }
  return base;
}

export function buildSceneShotBeats(params: {
  scene: ShotPlannerSceneInput;
  arcPhase: StoryArcPhase;
  focusShot: StudioShotType;
  focusMovement: StudioCameraMovement;
}): ShotBeat[] {
  const { scene, arcPhase, focusShot, focusMovement } = params;
  const focusText = focusLabel(scene);
  const includeDetail = shouldIncludeDetailBeat(scene, arcPhase);
  const openingShot = openingShotForPhase(focusShot, arcPhase);
  const closingShot = closingShotForPhase(focusShot, arcPhase);

  const beats: ShotBeat[] = [
    {
      role: "opening",
      present: true,
      shotType: openingShot,
      cameraMovement: beatMovement("opening", focusMovement, arcPhase),
      label: focusText ? "" : "",
      labelKey:
        arcPhase === "opening" || arcPhase === "discovery"
          ? "studio.shotPlanner.beat.openingEstablishing"
          : "studio.shotPlanner.beat.openingContext",
    },
    {
      role: "focus",
      present: true,
      shotType: focusShot,
      cameraMovement: focusMovement,
      label: focusText,
      labelKey: focusText ? undefined : "studio.shotPlanner.beat.focusFallback",
    },
  ];

  if (includeDetail) {
    beats.push({
      role: "detail",
      present: true,
      shotType: "detail_shot",
      cameraMovement: beatMovement("detail", focusMovement, arcPhase),
      label: "",
      labelKey: "studio.shotPlanner.beat.detailMoment",
    });
  }

  const closingLabel = scene.emotion?.trim();
  beats.push({
    role: "closing",
    present: true,
    shotType: closingShot,
    cameraMovement: beatMovement("closing", focusMovement, arcPhase),
    label: closingLabel ?? "",
    labelKey: closingLabel ? undefined : "studio.shotPlanner.beat.closingResult",
  });

  return beats;
}

export function sceneInputFromStoryboard(
  storyboard: StudioStoryboardDetail
): ShotPlannerSceneInput[] {
  return [...storyboard.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => ({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title,
      shotType: scene.shotType,
      cameraMovement: scene.cameraMovement,
      sceneEnergy: scene.sceneEnergy,
      camera: scene.camera,
      description: scene.description,
      action: scene.action,
      emotion: scene.emotion,
      durationSeconds: scene.durationSeconds,
    }));
}

export function buildSceneShotPlan(params: {
  scene: ShotPlannerSceneInput;
  sceneCount: number;
  recommendation?: ShotPlanRecommendation;
}): SceneShotPlan {
  const { scene, sceneCount, recommendation } = params;
  const arcPhase =
    recommendation?.arcPhase ??
    detectArcPhaseForIndex(scene.order, sceneCount);
  const focusShot =
    recommendation?.shotType ??
    (resolveSceneShotType(scene.shotType, scene.camera) || "medium");
  const focusMovement =
    recommendation?.cameraMovement ??
    ((scene.cameraMovement?.trim() || "static") as StudioCameraMovement);
  const sceneEnergy =
    recommendation?.sceneEnergy ??
    ((scene.sceneEnergy?.trim() || "neutral") as StudioSceneEnergy);

  return {
    sceneId: scene.sceneId,
    order: scene.order,
    title: scene.title,
    arcPhase,
    shotType: focusShot,
    cameraMovement: focusMovement,
    sceneEnergy,
    durationSeconds: scene.durationSeconds ?? 5,
    beats: buildSceneShotBeats({
      scene,
      arcPhase,
      focusShot,
      focusMovement,
    }),
  };
}

export function buildStoryboardShotPlan(params: {
  storyboard: StudioStoryboardDetail;
  directorProfile?: StudioDirectorProfile;
  recommendations?: ShotPlanRecommendation[];
}): StoryboardShotPlan {
  const scenes = sceneInputFromStoryboard(params.storyboard);
  const profile = normalizeStudioDirectorProfile(
    params.directorProfile ?? params.storyboard.directorProfile
  );
  const recommendations =
    params.recommendations ?? buildAutoShotPlan(scenes, profile);
  const recById = new Map(recommendations.map((row) => [row.sceneId, row]));

  const scenePlans = scenes.map((scene) =>
    buildSceneShotPlan({
      scene,
      sceneCount: scenes.length,
      recommendation: recById.get(scene.sceneId),
    })
  );

  const flowInput = storyboardToFlowInput(params.storyboard);
  const diversity = computeShotDiversityScore(flowInput);

  return {
    scenes: scenePlans,
    cameraFlow: scenePlans.map((plan) => ({
      sceneId: plan.sceneId,
      order: plan.order,
      shotType: plan.shotType,
      cameraMovement: plan.cameraMovement,
      sceneEnergy: plan.sceneEnergy,
    })),
    motionProgression: scenePlans.map((plan) => ({
      sceneId: plan.sceneId,
      order: plan.order,
      movement: plan.cameraMovement,
      energy: plan.sceneEnergy,
    })),
    pacingSeconds: scenePlans.map((plan) => plan.durationSeconds),
    shotDiversityScore: diversity,
  };
}

export function buildProposedStoryboardShotPlan(params: {
  storyboard: StudioStoryboardDetail;
  prompt: string;
  styleStrength: AiDirectorStyleStrength;
}): { direction: AiDirectorDirection; plan: StoryboardShotPlan } {
  const scenes = sceneInputFromStoryboard(params.storyboard);
  const flow = storyboardToFlowInput(params.storyboard);
  const direction = buildAiDirectorDirection({
    scenes: flow,
    prompt: params.prompt,
    styleStrength: params.styleStrength,
  });
  const plan = buildStoryboardShotPlan({
    storyboard: params.storyboard,
    recommendations: direction.plan,
  });
  return { direction, plan };
}

export function buildCurrentStoryboardShotPlan(
  storyboard: StudioStoryboardDetail
): StoryboardShotPlan {
  const flow = storyboardToFlowInput(storyboard);
  return buildStoryboardShotPlan({
    storyboard,
    recommendations: planFromCurrentScenes(flow),
  });
}

export function analyzeShotPlanConsistency(
  plan: StoryboardShotPlan
): ShotPlanConsistencyAdvice[] {
  const advice: ShotPlanConsistencyAdvice[] = [];
  const flowInput: StoryFlowSceneInput[] = plan.cameraFlow.map((row) => ({
    sceneId: row.sceneId,
    order: row.order,
    title: "",
    shotType: row.shotType,
    cameraMovement: row.cameraMovement,
    sceneEnergy: row.sceneEnergy,
  }));
  const flow = analyzeStoryFlow(flowInput);

  for (const warning of flow.warnings) {
    advice.push({
      code:
        warning.code === "repeated_shot_streak"
          ? "repeated_shot_streak"
          : warning.code === "low_shot_variety"
            ? "low_shot_variety"
            : "repeated_shot_streak",
      messageKey: warning.messageKey,
      sceneIds: warning.sceneIds,
    });
  }

  const closeCount = plan.cameraFlow.filter((row) => CLOSE_SHOTS.has(row.shotType)).length;
  if (plan.cameraFlow.length >= 3 && closeCount / plan.cameraFlow.length > 0.6) {
    advice.push({
      code: "too_many_close_ups",
      messageKey: "studio.shotPlanner.advice.tooManyCloseUps",
      sceneIds: plan.cameraFlow
        .filter((row) => CLOSE_SHOTS.has(row.shotType))
        .map((row) => row.sceneId),
    });
  }

  const wideCount = plan.cameraFlow.filter((row) => WIDE_SHOTS.has(row.shotType)).length;
  if (plan.cameraFlow.length >= 3 && wideCount / plan.cameraFlow.length > 0.7) {
    advice.push({
      code: "too_many_wide_shots",
      messageKey: "studio.shotPlanner.advice.tooManyWideShots",
      sceneIds: plan.cameraFlow
        .filter((row) => WIDE_SHOTS.has(row.shotType))
        .map((row) => row.sceneId),
    });
  }

  const unset = plan.cameraFlow.filter((row) => !row.shotType).length;
  if (unset > 0 || plan.scenes.length === 0) {
    advice.push({
      code: "missing_shot_flow",
      messageKey: "studio.shotPlanner.advice.missingFlow",
      sceneIds: [],
    });
  }

  return advice;
}

export function analyzeShotPlanContinuity(params: {
  plan: StoryboardShotPlan;
  recurringShotCounts?: Map<string, number>;
  recurringMovementCounts?: Map<string, number>;
}): ShotPlanContinuityInsight[] {
  const insights: ShotPlanContinuityInsight[] = [];
  const shotCounts = params.recurringShotCounts ?? new Map<string, number>();
  const movementCounts = params.recurringMovementCounts ?? new Map<string, number>();

  for (const row of params.plan.cameraFlow) {
    shotCounts.set(row.shotType, (shotCounts.get(row.shotType) ?? 0) + 1);
    movementCounts.set(row.cameraMovement, (movementCounts.get(row.cameraMovement) ?? 0) + 1);
  }

  const topShot = [...shotCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topShot && topShot[1] >= 3) {
    insights.push({
      recurringShotType: topShot[0] as StudioShotType,
      shotTypeStoryboardCount: topShot[1],
      movementStoryboardCount: 0,
      messageKey: "studio.shotPlanner.continuity.recurringShot",
    });
  }

  const topMovement = [...movementCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topMovement && topMovement[1] >= 3) {
    insights.push({
      recurringCameraMovement: topMovement[0] as StudioCameraMovement,
      shotTypeStoryboardCount: 0,
      movementStoryboardCount: topMovement[1],
      messageKey: "studio.shotPlanner.continuity.recurringMovement",
    });
  }

  return insights;
}

export function resolveStoryboardShotPlanReadiness(
  storyboard: StudioStoryboardDetail
): ShotPlanReadiness {
  const plan = buildCurrentStoryboardShotPlan(storyboard);
  const advice = analyzeShotPlanConsistency(plan);
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);

  const hasShotFlow =
    plan.scenes.length > 0 &&
    plan.cameraFlow.every((row) => Boolean(row.shotType)) &&
    !advice.some((a) => a.code === "missing_shot_flow");

  const hasPacing =
    scenes.length > 0 &&
    scenes.every((scene) => (scene.durationSeconds ?? 0) > 0) &&
    plan.pacingSeconds.reduce((sum, seconds) => sum + seconds, 0) > 0;

  let motionLogical = true;
  if (plan.motionProgression.length === 0) {
    motionLogical = false;
  } else {
    motionLogical = plan.motionProgression.every(
      (row) => Boolean(row.movement) && Boolean(row.energy)
    );
  }

  const recommendationKeys: string[] = [];
  if (!hasShotFlow) {
    recommendationKeys.push("studio.shotPlanner.readiness.missingFlow");
  }
  if (!hasPacing) {
    recommendationKeys.push("studio.shotPlanner.readiness.missingPacing");
  }
  if (!motionLogical) {
    recommendationKeys.push("studio.shotPlanner.readiness.motionReview");
  }
  for (const item of advice.slice(0, 2)) {
    recommendationKeys.push(item.messageKey);
  }

  return {
    hasShotFlow,
    hasPacing,
    motionLogical,
    recommendationKeys: [...new Set(recommendationKeys)].slice(0, 4),
  };
}
