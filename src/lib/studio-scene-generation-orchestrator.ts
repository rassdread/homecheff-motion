/**
 * Studio V2 — Scene Generation Orchestrator.
 * Unifies planner outputs into an ordered image production plan (no generation).
 */

import { buildStoryboardActionShotDistribution } from "@/lib/studio-action-shot-distribution";
import { buildStoryboardAssetEvolution, buildVisualProductionAssetGaps } from "@/lib/studio-asset-evolution";
import { buildStudioAnimationPlan } from "@/lib/studio-animation-planner";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { UnifiedReadinessLevel } from "@/lib/studio-unified-readiness";
import type {
  AnimationRequiredImageRole,
  StudioAnimationPlan,
} from "@/types/studio-animation-plan";
import type {
  SceneActionShotDistribution,
  StoryboardActionShotDistribution,
} from "@/types/studio-action-shot-distribution";
import type { StudioSceneDetail } from "@/types/studio-api";
import type { StudioRenderStrategy } from "@/types/studio-render-strategy";
import type {
  SceneGenerationAssetDependency,
  SceneGenerationImagePriority,
  SceneGenerationImageStatus,
  SceneGenerationMissingAsset,
  SceneGenerationPlanImage,
  SceneGenerationPlanStep,
  SceneGenerationRecommendation,
  StudioSceneGenerationPlan,
  StudioSceneGenerationPlanInput,
} from "@/types/studio-scene-generation-plan";

const ROLE_LABEL: Record<AnimationRequiredImageRole, string> = {
  scene_still: "studio.generationPlan.role.sceneStill",
  start_frame: "studio.generationPlan.role.startFrame",
  end_frame: "studio.generationPlan.role.endFrame",
  start_pose: "studio.generationPlan.role.startPose",
  action_pose: "studio.generationPlan.role.actionPose",
  payoff_pose: "studio.generationPlan.role.payoffPose",
  end_pose: "studio.generationPlan.role.endPose",
};

function classifyPriority(
  role: AnimationRequiredImageRole,
  strategy: StudioRenderStrategy
): SceneGenerationImagePriority {
  if (role === "scene_still" || role === "start_frame" || role === "start_pose") {
    return "required";
  }
  if (role === "end_frame" || role === "end_pose") {
    return strategy === "action_chain" ? "required" : "recommended";
  }
  if (role === "action_pose" || role === "payoff_pose") {
    return "recommended";
  }
  return "optional";
}

function resolveImageStatus(params: {
  missingImage: boolean;
  scene: StudioSceneDetail;
  role: AnimationRequiredImageRole;
  assetBlocked: boolean;
}): SceneGenerationImageStatus {
  if (
    (params.role === "scene_still" ||
      params.role === "start_frame" ||
      params.role === "start_pose") &&
    sceneHasCompletedImage(params.scene) &&
    !params.missingImage
  ) {
    return "present";
  }
  if (params.assetBlocked) {
    return "blocked";
  }
  if (params.missingImage) {
    return "missing";
  }
  return "missing";
}

function buildSceneAssetDependencies(
  scene: StudioSceneDetail,
  distribution: SceneActionShotDistribution | undefined,
  characters: StudioSceneGenerationPlanInput["characters"],
  locations: StudioSceneGenerationPlanInput["locations"]
): SceneGenerationAssetDependency[] {
  const deps: SceneGenerationAssetDependency[] = [];

  for (const ref of scene.characters) {
    const linked = characters?.some((c) => c.id === ref.id);
    deps.push({
      kind: "character",
      name: ref.name?.trim() || ref.id,
      status: linked ? "present" : "missing",
      labelKey: linked
        ? "studio.generationPlan.dependency.characterPresent"
        : "studio.generationPlan.dependency.characterMissing",
    });
  }

  const locationLabel = scene.location?.name?.trim() ?? "";

  if (scene.locationId || locationLabel) {
    const linked = locations?.some((l) => l.id === scene.locationId);
    deps.push({
      kind: "location",
      name: locationLabel || scene.locationId || "",
      status: linked || Boolean(locationLabel) ? "present" : "missing",
      labelKey:
        linked || locationLabel
          ? "studio.generationPlan.dependency.locationPresent"
          : "studio.generationPlan.dependency.locationMissing",
    });
  } else {
    deps.push({
      kind: "location",
      name: "",
      status: "missing",
      labelKey: "studio.generationPlan.dependency.locationMissing",
    });
  }

  for (const missing of distribution?.actionChain.missingSupportingAssets ?? []) {
    if (missing.kind === "prop") {
      deps.push({
        kind: "prop",
        name: missing.reasonParams?.name ?? "prop",
        status: "missing",
        labelKey: missing.reasonKey,
      });
    }
  }

  return deps.slice(0, 6);
}

function sceneAssetBlocked(deps: SceneGenerationAssetDependency[]): boolean {
  return deps.some(
    (d) =>
      d.status === "missing" &&
      (d.kind === "character" || d.kind === "location")
  );
}

function buildImagesFromAnimationPlan(params: {
  animationPlan: StudioAnimationPlan;
  storyboard: StudioSceneGenerationPlanInput["storyboard"];
  strategy: StudioRenderStrategy;
  actionDistribution: StoryboardActionShotDistribution;
}): SceneGenerationPlanImage[] {
  const sceneById = new Map(params.storyboard.scenes.map((s) => [s.id, s]));
  const distByScene = new Map(
    params.actionDistribution.scenes.map((d) => [d.sceneId, d])
  );
  const items: SceneGenerationPlanImage[] = [];

  for (const animScene of params.animationPlan.scenes) {
    const scene = sceneById.get(animScene.sceneId);
    if (!scene) {
      continue;
    }
    const distribution = distByScene.get(animScene.sceneId);

    animScene.shots.forEach((shot, shotIndex) => {
      const priority = classifyPriority(shot.requiredImageRole, params.strategy);
      const deps = buildSceneAssetDependencies(scene, distribution, [], []);
      const blocked = sceneAssetBlocked(deps);
      const status = resolveImageStatus({
        missingImage: shot.missingImage,
        scene,
        role: shot.requiredImageRole,
        assetBlocked: blocked,
      });

      items.push({
        id: `${animScene.sceneId}-${shotIndex}-${shot.requiredImageRole}`,
        sceneId: animScene.sceneId,
        sceneOrder: animScene.sceneOrder,
        sceneTitle: animScene.sceneTitle,
        shotIndex,
        actionBeat: shot.actionBeat,
        imageRole: shot.requiredImageRole,
        priority,
        status,
        orderIndex: 0,
        roleLabelKey: ROLE_LABEL[shot.requiredImageRole],
        assetDependencies: deps,
        blockedReasonKey: blocked ? "studio.generationPlan.blocked.missingAssets" : undefined,
        toolId: "visual",
      });
    });
  }

  return items;
}

function assignGenerationOrder(items: SceneGenerationPlanImage[]): SceneGenerationPlanImage[] {
  const priorityWeight: Record<SceneGenerationImagePriority, number> = {
    required: 0,
    recommended: 1,
    optional: 2,
  };
  const statusWeight: Record<SceneGenerationImageStatus, number> = {
    blocked: 0,
    missing: 1,
    present: 2,
  };

  const sorted = [...items].sort((a, b) => {
    const pw = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (pw !== 0) return pw;
    const sw = statusWeight[a.status] - statusWeight[b.status];
    if (sw !== 0) return sw;
    if (a.sceneOrder !== b.sceneOrder) return a.sceneOrder - b.sceneOrder;
    return a.shotIndex - b.shotIndex;
  });

  return sorted.map((item, index) => ({
    ...item,
    orderIndex: index + 1,
  }));
}

function buildGenerationSteps(
  items: SceneGenerationPlanImage[]
): SceneGenerationPlanStep[] {
  const steps: SceneGenerationPlanStep[] = [];
  const missingRequired = items.filter(
    (i) => i.priority === "required" && i.status !== "present"
  );
  const missingRecommended = items.filter(
    (i) => i.priority === "recommended" && i.status !== "present"
  );

  if (missingRequired.length > 0) {
    steps.push({
      order: 1,
      itemIds: missingRequired.map((i) => i.id),
      summaryKey: "studio.generationPlan.step.required",
      summaryParams: { count: String(missingRequired.length) },
    });
  }
  if (missingRecommended.length > 0) {
    steps.push({
      order: steps.length + 1,
      itemIds: missingRecommended.map((i) => i.id),
      summaryKey: "studio.generationPlan.step.recommended",
      summaryParams: { count: String(missingRecommended.length) },
    });
  }

  return steps;
}

function buildMissingAssets(params: {
  storyboard: StudioSceneGenerationPlanInput["storyboard"];
  characters?: StudioSceneGenerationPlanInput["characters"];
  locations?: StudioSceneGenerationPlanInput["locations"];
  props?: StudioSceneGenerationPlanInput["props"];
  worlds?: StudioSceneGenerationPlanInput["worlds"];
}): SceneGenerationMissingAsset[] {
  const items: SceneGenerationMissingAsset[] = [];
  const gaps = buildVisualProductionAssetGaps(params.storyboard);
  const evolution = buildStoryboardAssetEvolution({
    storyboard: params.storyboard,
    characters: params.characters ?? [],
    locations: params.locations ?? [],
    props: params.props ?? [],
    worlds: params.worlds ?? [],
  });

  for (const gap of gaps) {
    items.push({
      id: `gap-${gap.code}-${gap.sceneOrders[0] ?? 0}`,
      kind: gap.kind === "world" ? "world" : gap.kind,
      name: gap.kind,
      reasonKey: gap.messageKey,
      toolId: gap.kind === "character" ? "characters" : gap.kind === "location" ? "locations" : "props",
      sceneOrders: gap.sceneOrders,
    });
  }

  for (const section of evolution.sections) {
    for (const missing of section.missing) {
      items.push({
        id: `asset-${section.kind}-${missing.name}`,
        kind: section.kind,
        name: missing.name || section.kind,
        reasonKey: missing.reasonKeys?.[0] ?? "studio.generationPlan.asset.missing",
        toolId:
          section.kind === "world"
            ? "world"
            : section.kind === "character"
              ? "characters"
              : section.kind === "location"
                ? "locations"
                : "props",
        sceneOrders: [],
      });
    }
  }

  return items.slice(0, 12);
}

function computeReadiness(items: SceneGenerationPlanImage[]): {
  level: UnifiedReadinessLevel;
  score: number;
  readyToRender: boolean;
  requiredMissing: number;
  recommendedMissing: number;
  optionalMissing: number;
  blockedCount: number;
} {
  const required = items.filter((i) => i.priority === "required");
  const recommended = items.filter((i) => i.priority === "recommended");
  const optional = items.filter((i) => i.priority === "optional");

  const requiredMissing = required.filter((i) => i.status === "missing").length;
  const recommendedMissing = recommended.filter((i) => i.status === "missing").length;
  const optionalMissing = optional.filter((i) => i.status === "missing").length;
  const blockedCount = items.filter((i) => i.status === "blocked").length;
  const presentCount = items.filter((i) => i.status === "present").length;

  let level: UnifiedReadinessLevel = "needs_work";
  if (requiredMissing === 0 && blockedCount === 0) {
    level = recommendedMissing === 0 ? "ready" : "almost_ready";
  } else if (requiredMissing <= 2 && blockedCount === 0) {
    level = "almost_ready";
  }

  const score =
    items.length === 0
      ? 0
      : Math.round((presentCount / items.length) * 100);

  return {
    level,
    score,
    readyToRender: requiredMissing === 0 && blockedCount === 0,
    requiredMissing,
    recommendedMissing,
    optionalMissing,
    blockedCount,
  };
}

function buildRecommendations(params: {
  readiness: ReturnType<typeof computeReadiness>;
  missingAssets: SceneGenerationMissingAsset[];
  steps: SceneGenerationPlanStep[];
}): SceneGenerationRecommendation[] {
  const recs: SceneGenerationRecommendation[] = [];

  if (params.missingAssets.length > 0) {
    recs.push({
      id: "assets-first",
      messageKey: "studio.generationPlan.rec.assetsFirst",
      messageParams: { count: String(params.missingAssets.length) },
      toolId: "characters",
      priority: "high",
    });
  }

  if (params.readiness.requiredMissing > 0) {
    recs.push({
      id: "required-images",
      messageKey: "studio.generationPlan.rec.requiredImages",
      messageParams: { count: String(params.readiness.requiredMissing) },
      toolId: "visual",
      priority: "high",
    });
  }

  if (params.steps.length > 0) {
    recs.push({
      id: "follow-order",
      messageKey: "studio.generationPlan.rec.followOrder",
      priority: "medium",
    });
  }

  return recs.slice(0, 6);
}

/**
 * Build unified scene generation plan from existing Studio planners.
 */
export function buildSceneGenerationPlan(
  input: StudioSceneGenerationPlanInput
): StudioSceneGenerationPlan {
  const storyboard = input.storyboard;
  const styleProfile = normalizeStudioPromptStyleProfile(
    input.styleProfile ?? storyboard.promptStyleProfile
  );
  const directorProfile = normalizeStudioDirectorProfile(
    input.directorProfile ?? storyboard.directorProfile
  );

  const renderStrategyPlan =
    input.renderStrategyPlan ??
    buildStudioRenderStrategyPlan({
      storyboard,
      characters: input.characters,
      locations: input.locations,
      props: input.props,
      worlds: input.worlds,
    });

  const actionShotDistributions =
    input.actionShotDistributions ??
    buildStoryboardActionShotDistribution({
      storyboard,
      characters: input.characters,
      props: input.props,
      worlds: input.worlds,
    });

  const productionPlan = input.productionPlan;

  const animationPlan =
    input.animationPlan ??
    buildStudioAnimationPlan({
      storyboard,
      productionPlan,
      renderStrategyPlan,
      actionShotDistributions,
      characters: input.characters,
      locations: input.locations,
      props: input.props,
      worlds: input.worlds,
      projectMemory: input.projectMemory,
      styleProfile,
      directorProfile,
    });

  const strategy = renderStrategyPlan.recommendedStrategy;
  let allItems = buildImagesFromAnimationPlan({
    animationPlan,
    storyboard,
    strategy,
    actionDistribution: actionShotDistributions,
  });

  allItems = assignGenerationOrder(
    allItems.map((item) => {
      const scene = storyboard.scenes.find((s) => s.id === item.sceneId);
      if (!scene) {
        return item;
      }
      const distribution = actionShotDistributions.scenes.find(
        (d) => d.sceneId === item.sceneId
      );
      const deps = buildSceneAssetDependencies(
        scene,
        distribution,
        input.characters,
        input.locations
      );
      const blocked = sceneAssetBlocked(deps);
      return {
        ...item,
        assetDependencies: deps,
        status:
          blocked && item.status !== "present" ? ("blocked" as const) : item.status,
        blockedReasonKey: blocked ? "studio.generationPlan.blocked.missingAssets" : undefined,
      };
    })
  );

  const requiredImages = allItems.filter((i) => i.priority === "required");
  const recommendedImages = allItems.filter((i) => i.priority === "recommended");
  const optionalImages = allItems.filter((i) => i.priority === "optional");

  const generationSteps = buildGenerationSteps(allItems);
  const missingAssets = buildMissingAssets({
    storyboard,
    characters: input.characters,
    locations: input.locations,
    props: input.props,
    worlds: input.worlds,
  });
  const readiness = computeReadiness(allItems);
  const recommendations = buildRecommendations({
    readiness,
    missingAssets,
    steps: generationSteps,
  });

  const totalPresent = allItems.filter((i) => i.status === "present").length;
  const totalMissing = allItems.filter(
    (i) => i.status === "missing" || i.status === "blocked"
  ).length;

  const firstMissing = allItems.find((i) => i.status !== "present");

  return {
    guidanceKey: "studio.generationPlan.guidance.createFirst",
    guidanceParams: {
      count: String(readiness.requiredMissing + readiness.recommendedMissing),
      first: firstMissing?.actionBeat || firstMissing?.sceneTitle || "",
    },
    requiredImages,
    recommendedImages,
    optionalImages,
    generationSteps,
    missingAssets,
    recommendations,
    readiness,
    totalRequired: requiredImages.length,
    totalRecommended: recommendedImages.length,
    totalOptional: optionalImages.length,
    totalPresent,
    totalMissing,
    directorContextLines: [
      `generation:required:${readiness.requiredMissing}`,
      `generation:recommended:${readiness.recommendedMissing}`,
      `generation:ready:${readiness.readyToRender}`,
      `generation:strategy:${strategy}`,
      missingAssets.length > 0 ? `generation:assets:${missingAssets.length}` : "",
    ].filter(Boolean),
  };
}

export function enrichIdeaWithGenerationPlan(
  idea: string,
  plan: StudioSceneGenerationPlan
): string {
  const lines = plan.directorContextLines.join("; ");
  if (!lines.trim()) {
    return idea;
  }
  return `${idea.trim()}\n\n[Generation plan: ${lines}]`;
}
