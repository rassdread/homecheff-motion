/**
 * Studio V2 — Animation Planner.
 * Translates production planning into animation planning (no render execution).
 */

import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStoryboardIdentityConsumption } from "@/lib/studio-identity-consumption";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import { buildStudioProductionPlan } from "@/lib/studio-production-planner";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { buildCurrentStoryboardShotPlan } from "@/lib/studio-shot-planner";
import {
  normalizeStudioCameraMovement,
  type StudioCameraMovement,
  type StudioSceneEnergy,
} from "@/lib/studio-scene-director";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type {
  ActionDistributionBeat,
  ActionDistributionBeatRole,
  ActionDistributionImageRole,
  SceneActionShotDistribution,
  StoryboardActionShotDistribution,
} from "@/types/studio-action-shot-distribution";
import type {
  AnimationMotionIntent,
  AnimationPlanReadiness,
  AnimationPlanScene,
  AnimationPlanShot,
  AnimationRenderModeHint,
  AnimationRequiredImageRole,
  AnimationShotRole,
  AnimationSpeedAdvice,
  StudioAnimationPlan,
  StudioAnimationPlanInput,
} from "@/types/studio-animation-plan";
import type { StudioSceneDetail } from "@/types/studio-api";
import type {
  ActionComplexityLevel,
  RenderStrategySceneAssignment,
  StudioRenderStrategy,
  StudioRenderStrategyPlan,
} from "@/types/studio-render-strategy";

const MOTION_INTENT_KEYS: Record<AnimationMotionIntent, string> = {
  slow_push: "studio.animationPlan.motion.slowPush",
  tracking: "studio.animationPlan.motion.tracking",
  handheld_energy: "studio.animationPlan.motion.handheldEnergy",
  quick_cut: "studio.animationPlan.motion.quickCut",
  hold: "studio.animationPlan.motion.hold",
  reveal: "studio.animationPlan.motion.reveal",
  action_follow: "studio.animationPlan.motion.actionFollow",
};

const ROLE_DURATION_WEIGHT: Record<AnimationShotRole, number> = {
  opening: 0.75,
  setup: 0.85,
  action: 1.35,
  payoff: 0.7,
  closing: 0.9,
  scene: 1,
};

function sceneDurationSeconds(scene: StudioSceneDetail): number {
  return scene.durationSeconds > 0 ? scene.durationSeconds : 5;
}

function beatRoleToShotRole(role: ActionDistributionBeatRole): AnimationShotRole {
  return role;
}

function imageRoleToRequired(
  role: ActionDistributionImageRole | "scene_still" | "start_frame" | "end_frame"
): AnimationRequiredImageRole {
  if (role === "start_frame") return "start_frame";
  if (role === "end_frame") return "end_frame";
  return role;
}

function resolveSceneRenderMode(
  globalStrategy: StudioRenderStrategy,
  assignment: RenderStrategySceneAssignment | undefined
): AnimationRenderModeHint {
  if (globalStrategy === "story") return "story";
  if (globalStrategy === "action_chain") return "action_chain";
  return assignment?.strategy === "action_chain" ? "hybrid_action" : "hybrid_story";
}

function sceneUsesActionShots(
  globalStrategy: StudioRenderStrategy,
  assignment: RenderStrategySceneAssignment | undefined
): boolean {
  if (globalStrategy === "action_chain") return true;
  if (globalStrategy === "hybrid") return assignment?.strategy === "action_chain";
  return false;
}

function resolveMotionIntent(params: {
  role: AnimationShotRole;
  cameraMovement: StudioCameraMovement | "";
  sceneEnergy: StudioSceneEnergy;
  complexity: ActionComplexityLevel;
}): AnimationMotionIntent {
  const { role, cameraMovement, sceneEnergy, complexity } = params;

  if (cameraMovement === "push_in" || cameraMovement === "pull_out") {
    return role === "action" ? "action_follow" : "slow_push";
  }
  if (cameraMovement === "tracking" || cameraMovement === "follow") {
    return "tracking";
  }
  if (sceneEnergy === "intense" || (sceneEnergy === "dynamic" && complexity !== "low")) {
    return role === "action" || role === "payoff" ? "action_follow" : "handheld_energy";
  }
  if (role === "opening" || role === "setup") return "reveal";
  if (role === "payoff" || role === "closing") return "quick_cut";
  if (role === "action") return "action_follow";
  if (cameraMovement === "static" || cameraMovement === "") return "hold";
  return "slow_push";
}

function allocateShotDurations(
  roles: AnimationShotRole[],
  sceneDuration: number
): number[] {
  if (roles.length === 0) return [sceneDuration];
  const weights = roles.map((role) => ROLE_DURATION_WEIGHT[role] ?? 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const raw = weights.map((w) => Math.max(1, Math.round((w / totalWeight) * sceneDuration)));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum !== sceneDuration && raw.length > 0) {
    raw[raw.length - 1] = Math.max(1, raw[raw.length - 1]! + (sceneDuration - sum));
  }
  return raw;
}

function buildStorySceneShot(params: {
  scene: StudioSceneDetail;
  renderModeHint: AnimationRenderModeHint;
  cameraMovement: StudioCameraMovement | "";
  sceneEnergy: StudioSceneEnergy;
  complexity: ActionComplexityLevel;
  sceneStartTime: number;
}): AnimationPlanShot[] {
  const duration = sceneDurationSeconds(params.scene);
  const actionBeat =
    params.scene.action?.trim() ||
    params.scene.description?.trim() ||
    params.scene.title?.trim() ||
    "";
  const motionIntent = resolveMotionIntent({
    role: "scene",
    cameraMovement: params.cameraMovement,
    sceneEnergy: params.sceneEnergy,
    complexity: params.complexity,
  });

  return [
    {
      shotRole: "scene",
      actionBeat,
      startTime: params.sceneStartTime,
      endTime: params.sceneStartTime + duration,
      durationSeconds: duration,
      motionIntent,
      motionIntentKey: MOTION_INTENT_KEYS[motionIntent],
      cameraIntent: params.cameraMovement || "static",
      cameraIntentKey: params.cameraMovement
        ? (`studio.sceneDirector.cameraMovement.${params.cameraMovement}` as string)
        : undefined,
      requiredImageRole: "scene_still",
      missingImage: !sceneHasCompletedImage(params.scene),
      renderModeHint: params.renderModeHint,
    },
  ];
}

function buildActionSceneShots(params: {
  scene: StudioSceneDetail;
  distribution: SceneActionShotDistribution | undefined;
  renderModeHint: AnimationRenderModeHint;
  cameraMovement: StudioCameraMovement | "";
  sceneEnergy: StudioSceneEnergy;
  complexity: ActionComplexityLevel;
  sceneStartTime: number;
}): AnimationPlanShot[] {
  const duration = sceneDurationSeconds(params.scene);
  const beats: ActionDistributionBeat[] =
    params.distribution?.beats.length ?
      params.distribution.beats
    : [
        {
          role: "action",
          order: 1,
          stepId: "generic_action",
          labelKey: "studio.actionSequence.step.generic",
          actionHint: params.scene.action?.trim() || params.scene.title,
          imageRole: "start_pose",
          imageStatus: sceneHasCompletedImage(params.scene) ? "present" : "missing",
        },
      ];

  const roles = beats.map((beat) => beatRoleToShotRole(beat.role));
  const durations = allocateShotDurations(roles, duration);
  let cursor = params.sceneStartTime;

  return beats.map((beat, index) => {
    const shotDuration = durations[index] ?? 1;
    const role = beatRoleToShotRole(beat.role);
    const motionIntent = resolveMotionIntent({
      role,
      cameraMovement: params.cameraMovement,
      sceneEnergy: params.sceneEnergy,
      complexity: params.complexity,
    });
    const shot: AnimationPlanShot = {
      shotRole: role,
      actionBeat: beat.actionHint,
      actionBeatKey: beat.labelKey,
      startTime: cursor,
      endTime: cursor + shotDuration,
      durationSeconds: shotDuration,
      motionIntent,
      motionIntentKey: MOTION_INTENT_KEYS[motionIntent],
      cameraIntent: params.cameraMovement || "static",
      cameraIntentKey: params.cameraMovement
        ? (`studio.sceneDirector.cameraMovement.${params.cameraMovement}` as string)
        : undefined,
      requiredImageRole: imageRoleToRequired(beat.imageRole),
      missingImage: beat.imageStatus === "missing",
      renderModeHint: params.renderModeHint,
    };
    cursor += shotDuration;
    return shot;
  });
}

function buildSpeedAdvice(renderPlan: StudioRenderStrategyPlan): AnimationSpeedAdvice {
  const provider = renderPlan.estimatedProviderDurationSeconds;
  const final = renderPlan.estimatedFinalDurationSeconds;
  const speed = renderPlan.suggestedSpeedAdjustment;

  return {
    providerDurationSeconds: provider,
    finalDurationSeconds: final,
    suggestedSpeedAdjustment: speed,
    speedAdviceOnly: true,
    speedLabelKey:
      speed && speed > 1
        ? "studio.animationPlan.speed.faster"
        : speed && speed < 1
          ? "studio.animationPlan.speed.slower"
          : "studio.animationPlan.speed.match",
    speedSummaryKey: "studio.animationPlan.speed.summary",
    speedSummaryParams: {
      provider: String(provider),
      final: String(final),
      speed: speed ? speed.toFixed(2) : "1.00",
    },
  };
}

function buildReadiness(params: {
  scenes: AnimationPlanScene[];
  missingImageCount: number;
  actionDistribution: StoryboardActionShotDistribution;
  renderPlan: StudioRenderStrategyPlan;
}): AnimationPlanReadiness {
  const { scenes, missingImageCount, actionDistribution, renderPlan } = params;
  const planPresent = scenes.length > 0 && scenes.some((s) => s.shots.length > 0);
  const timingLogical = actionDistribution.scenesNeedingSplit === 0;
  const imagesComplete = missingImageCount === 0;

  let actionStructureComplete = true;
  if (renderPlan.recommendedStrategy !== "story") {
    const actionScenes = actionDistribution.scenes.filter((d) => d.suggestsMultipleShots);
    actionStructureComplete =
      actionScenes.length === 0 ||
      actionScenes.every(
        (d) => d.beats.length >= 2 || d.durationAdvice.level !== "too_short"
      );
  }

  return {
    planPresent,
    timingLogical,
    imagesComplete,
    actionStructureComplete,
  };
}

export function buildStudioAnimationPlan(input: StudioAnimationPlanInput): StudioAnimationPlan {
  const storyboard = input.storyboard;
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const styleProfile = normalizeStudioPromptStyleProfile(
    input.styleProfile ?? storyboard.promptStyleProfile
  );
  const directorProfile = normalizeStudioDirectorProfile(
    input.directorProfile ?? storyboard.directorProfile
  );

  const renderPlan =
    input.renderStrategyPlan ??
    buildStudioRenderStrategyPlan({
      storyboard,
      characters: input.characters,
      locations: input.locations,
      props: input.props,
      worlds: input.worlds,
    });

  const actionDistribution =
    input.actionShotDistributions ??
    buildStoryboardActionShotDistribution({
      storyboard,
      characters: input.characters,
      props: input.props,
      worlds: input.worlds,
    });

  buildStoryboardIdentityConsumption({
    storyboard,
    libraries: {
      characters: input.characters ?? [],
      locations: input.locations ?? [],
      props: input.props ?? [],
      worlds: input.worlds ?? [],
    },
    memory: input.projectMemory,
  });

  const productionPlan =
    input.productionPlan ??
    buildStudioProductionPlan({
      storyboard,
      characters: input.characters,
      locations: input.locations,
      props: input.props,
      worlds: input.worlds,
      projectMemory: input.projectMemory,
      styleProfile,
      directorProfile,
    });

  const shotPlan = buildCurrentStoryboardShotPlan(storyboard);
  const shotPlanBySceneId = new Map(shotPlan.scenes.map((s) => [s.sceneId, s]));
  const distributionBySceneId = new Map(
    actionDistribution.scenes.map((d) => [d.sceneId, d])
  );

  let globalCursor = 0;
  const animationScenes: AnimationPlanScene[] = [];
  let totalShotCount = 0;
  let missingImageCount = 0;

  for (const scene of scenes) {
    const assignment = renderPlan.sceneAssignments.find((a) => a.sceneId === scene.id);
    const renderModeHint = resolveSceneRenderMode(renderPlan.recommendedStrategy, assignment);
    const useActionShots = sceneUsesActionShots(renderPlan.recommendedStrategy, assignment);
    const sceneShotPlan = shotPlanBySceneId.get(scene.id);
    const cameraMovement = normalizeStudioCameraMovement(
      sceneShotPlan?.cameraMovement ?? scene.cameraMovement
    );
    const sceneEnergy = sceneShotPlan?.sceneEnergy ?? "neutral";
    const complexity = assignment?.actionComplexity ?? renderPlan.actionComplexity;
    const targetDuration = sceneDurationSeconds(scene);

    const shots =
      useActionShots
        ? buildActionSceneShots({
            scene,
            distribution: distributionBySceneId.get(scene.id),
            renderModeHint,
            cameraMovement,
            sceneEnergy,
            complexity,
            sceneStartTime: globalCursor,
          })
        : buildStorySceneShot({
            scene,
            renderModeHint,
            cameraMovement,
            sceneEnergy,
            complexity,
            sceneStartTime: globalCursor,
          });

    for (const shot of shots) {
      if (shot.missingImage) missingImageCount += 1;
    }
    totalShotCount += shots.length;

    animationScenes.push({
      sceneId: scene.id,
      sceneOrder: scene.order,
      sceneTitle: scene.title,
      targetDuration,
      startTime: globalCursor,
      endTime: globalCursor + targetDuration,
      shots,
    });

    globalCursor += targetDuration;
  }

  const speedAdvice = buildSpeedAdvice(renderPlan);
  const readiness = buildReadiness({
    scenes: animationScenes,
    missingImageCount,
    actionDistribution,
    renderPlan,
  });

  const directorContextLines = [
    `animation:${globalCursor}s,${totalShotCount}shots`,
    `strategy:${renderPlan.recommendedStrategy}`,
    missingImageCount > 0 ? `images:${missingImageCount}missing` : "",
    speedAdvice.suggestedSpeedAdjustment
      ? `speed:${speedAdvice.suggestedSpeedAdjustment.toFixed(2)}x`
      : "",
    productionPlan.actionPlanning.totalActionSteps > 0
      ? `actions:${productionPlan.actionPlanning.totalActionSteps}`
      : "",
  ].filter(Boolean);

  return {
    totalTargetDuration: globalCursor,
    providerDurationEstimate: renderPlan.estimatedProviderDurationSeconds,
    finalDurationEstimate: renderPlan.estimatedFinalDurationSeconds,
    totalShotCount,
    missingImageCount,
    speedAdvice,
    readiness,
    recommendedStrategy: renderPlan.recommendedStrategy,
    scenes: animationScenes,
    directorContextLines,
  };
}

export function enrichIdeaWithAnimationPlan(idea: string, plan: StudioAnimationPlan): string {
  const context = [
    `[animation: ${plan.totalTargetDuration}s, ${plan.totalShotCount} shots]`,
    plan.missingImageCount > 0 ? `[animation-gaps: ${plan.missingImageCount} images]` : "",
    plan.speedAdvice.suggestedSpeedAdjustment
      ? `[edit-speed: ${plan.speedAdvice.suggestedSpeedAdjustment.toFixed(2)}x]`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${context}\n${idea}`.trim();
}

export { MOTION_INTENT_KEYS };
