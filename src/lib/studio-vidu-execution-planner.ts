/**
 * Studio V2 — Vidu Execution Planner.
 * Maps animation plan → execution jobs (planning only, no render start).
 */

import { buildStudioAnimationPlan } from "@/lib/studio-animation-planner";
import { buildStoryboardAudioMixPlan } from "@/lib/studio-audio-mix-resolve";
import { resolveStudioSceneImageHandoff } from "@/lib/studio-scene-image-handoff";
import { buildStudioRenderStrategyPlan } from "@/lib/studio-render-strategy-planner";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type {
  AnimationPlanScene,
  AnimationPlanShot,
  AnimationRenderModeHint,
  StudioAnimationPlan,
} from "@/types/studio-animation-plan";
import type { StudioRenderStrategy, StudioRenderStrategyPlan } from "@/types/studio-render-strategy";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  ViduExecutionFallbackPlan,
  ViduExecutionImageRole,
  ViduExecutionInputImage,
  ViduExecutionJob,
  ViduExecutionJobKind,
  ViduExecutionMissingRequirement,
  ViduExecutionMode,
  ViduExecutionPlan,
  ViduExecutionPlanInput,
  ViduExecutionReadiness,
  ViduExecutionWarning,
} from "@/types/studio-vidu-execution-plan";

const MODE_LABEL: Record<ViduExecutionMode, string> = {
  story_video: "studio.executionPlan.mode.storyVideo",
  action_chain: "studio.executionPlan.mode.actionChain",
  hybrid: "studio.executionPlan.mode.hybrid",
};

const APPROACH_SUMMARY: Record<ViduExecutionMode, string> = {
  story_video: "studio.executionPlan.approach.storyVideo",
  action_chain: "studio.executionPlan.approach.actionChain",
  hybrid: "studio.executionPlan.approach.hybrid",
};

function mapStrategyToExecutionMode(strategy: StudioRenderStrategy): ViduExecutionMode {
  if (strategy === "story") return "story_video";
  if (strategy === "action_chain") return "action_chain";
  return "hybrid";
}

function sceneUsesActionExecution(hint: AnimationRenderModeHint): boolean {
  return hint === "action_chain" || hint === "hybrid_action";
}

function resolveSceneImage(
  storyboard: StudioStoryboardDetail,
  scene: StudioSceneDetail
): { url: string | null; missing: boolean } {
  const resolved = resolveStudioSceneImageHandoff({
    storyboardId: storyboard.id,
    sceneId: scene.id,
    selectedSceneImageId: scene.selectedSceneImageId,
    sceneImages: scene.sceneImages.map((img) => ({
      id: img.id,
      status: img.status,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      promptVersion: img.promptVersion,
      generationVersion: img.generationVersion,
    })),
  });
  const url = resolved.selectedSceneImageUrl?.trim() || null;
  return { url, missing: !url };
}

function buildInputImage(params: {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  imageRole: ViduExecutionImageRole;
  shot?: AnimationPlanShot;
  forceMissing?: boolean;
}): ViduExecutionInputImage {
  const { url, missing } = resolveSceneImage(params.storyboard, params.scene);
  const needsEndOnly =
    params.imageRole === "end_frame" || params.imageRole === "end_pose";
  const isMissing = params.forceMissing ?? (needsEndOnly ? true : missing);

  return {
    sceneId: params.scene.id,
    sceneOrder: params.scene.order,
    sceneTitle: params.scene.title,
    imageUrl: needsEndOnly && params.forceMissing !== false ? null : url,
    imageRole: params.imageRole,
    missing: isMissing,
    shotRole: params.shot?.shotRole,
    beatLabel: params.shot?.actionBeatKey ?? params.shot?.actionBeat,
  };
}

function promptIntentForScene(scene: StudioSceneDetail, shot?: AnimationPlanShot): string {
  return (
    shot?.actionBeat?.trim() ||
    scene.action?.trim() ||
    scene.description?.trim() ||
    scene.title?.trim() ||
    ""
  );
}

function buildStoryVideoJobs(params: {
  storyboard: StudioStoryboardDetail;
  animationPlan: StudioAnimationPlan;
}): { jobs: ViduExecutionJob[]; missing: ViduExecutionMissingRequirement[] } {
  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const inputImages: ViduExecutionInputImage[] = [];
  const missing: ViduExecutionMissingRequirement[] = [];

  for (const scene of scenes) {
    const img = buildInputImage({
      storyboard: params.storyboard,
      scene,
      imageRole: "scene_still",
    });
    inputImages.push(img);
    if (img.missing) {
      missing.push({
        id: `story-image-${scene.id}`,
        kind: "image",
        reasonKey: "studio.executionPlan.missing.sceneImage",
        reasonParams: { title: scene.title || String(scene.order + 1) },
        sceneOrder: scene.order,
        suggestedActionKey: "studio.executionPlan.suggest.generateImage",
      });
    }
  }

  const duration = params.animationPlan.totalTargetDuration;

  return {
    jobs: [
      {
        id: "story-multiframe-0",
        jobKind: "story_multiframe",
        sceneIds: scenes.map((s) => s.id),
        beatLabels: scenes.map((s) => s.title || `scene-${s.order + 1}`),
        inputImages,
        durationSeconds: duration,
        promptIntent: scenes.map((s) => promptIntentForScene(s)).filter(Boolean).join(" · "),
        promptIntentKey: "studio.executionPlan.prompt.storyMontage",
        outputRole: "full_story",
        continuityHintKey: "studio.executionPlan.continuity.storyFlow",
      },
    ],
    missing,
  };
}

function buildActionJobsForScene(params: {
  storyboard: StudioStoryboardDetail;
  animScene: AnimationPlanScene;
  scene: StudioSceneDetail;
}): { jobs: ViduExecutionJob[]; missing: ViduExecutionMissingRequirement[]; warnings: ViduExecutionWarning[] } {
  const { animScene, scene } = params;
  const shots = animScene.shots;
  const jobs: ViduExecutionJob[] = [];
  const missing: ViduExecutionMissingRequirement[] = [];
  const warnings: ViduExecutionWarning[] = [];

  if (shots.length <= 1) {
    const start = buildInputImage({
      storyboard: params.storyboard,
      scene,
      imageRole: "start_frame",
      shot: shots[0],
    });
    const end = buildInputImage({
      storyboard: params.storyboard,
      scene,
      imageRole: "end_frame",
      shot: shots[0],
      forceMissing: true,
    });
    if (end.missing) {
      missing.push({
        id: `end-image-${scene.id}`,
        kind: "image",
        reasonKey: "studio.executionPlan.missing.endImage",
        reasonParams: { title: scene.title || String(scene.order + 1) },
        sceneOrder: scene.order,
        suggestedActionKey: "studio.executionPlan.suggest.generateImage",
      });
      warnings.push({
        id: `warn-end-${scene.id}`,
        messageKey: "studio.executionPlan.warning.missingEndImage",
        messageParams: { title: scene.title || String(scene.order + 1) },
      });
    }
    jobs.push({
      id: `action-${scene.id}-0`,
      jobKind: "action_start_end",
      sceneIds: [scene.id],
      beatLabels: [shots[0]?.actionBeatKey ?? shots[0]?.actionBeat ?? "action"],
      inputImages: [start, end],
      durationSeconds: animScene.targetDuration,
      promptIntent: promptIntentForScene(scene, shots[0]),
      outputRole: "action_beat",
      continuityHintKey: "studio.executionPlan.continuity.actionBeat",
    });
    return { jobs, missing, warnings };
  }

  for (let i = 0; i < shots.length - 1; i++) {
    const startShot = shots[i]!;
    const endShot = shots[i + 1]!;
    const startRole: ViduExecutionImageRole =
      i === 0 ? "start_frame" : "start_pose";
    const endRole: ViduExecutionImageRole =
      i === shots.length - 2 ? "end_frame" : "end_pose";

    const start = buildInputImage({
      storyboard: params.storyboard,
      scene,
      imageRole: startRole,
      shot: startShot,
      forceMissing: i > 0 ? true : undefined,
    });
    const end = buildInputImage({
      storyboard: params.storyboard,
      scene,
      imageRole: endRole,
      shot: endShot,
      forceMissing: true,
    });

    if (start.missing && i === 0) {
      missing.push({
        id: `start-image-${scene.id}-${i}`,
        kind: "image",
        reasonKey: "studio.executionPlan.missing.startImage",
        reasonParams: { title: scene.title || String(scene.order + 1) },
        sceneOrder: scene.order,
        suggestedActionKey: "studio.executionPlan.suggest.generateImage",
      });
    }
    if (end.missing) {
      missing.push({
        id: `end-image-${scene.id}-${i}`,
        kind: "image",
        reasonKey: "studio.executionPlan.missing.endImage",
        reasonParams: {
          title: scene.title || String(scene.order + 1),
          beat: endShot.actionBeat?.slice(0, 40) || String(i + 1),
        },
        sceneOrder: scene.order,
        suggestedActionKey: "studio.executionPlan.suggest.generateImage",
      });
      warnings.push({
        id: `warn-end-${scene.id}-${i}`,
        messageKey: "studio.executionPlan.warning.missingEndImage",
        messageParams: { title: scene.title || String(scene.order + 1) },
      });
    }

    jobs.push({
      id: `action-${scene.id}-${i}`,
      jobKind: "action_start_end",
      sceneIds: [scene.id],
      beatLabels: [
        startShot.actionBeatKey ?? startShot.actionBeat,
        endShot.actionBeatKey ?? endShot.actionBeat,
      ],
      inputImages: [start, end],
      durationSeconds: Math.max(1, endShot.startTime - startShot.startTime),
      promptIntent: `${startShot.actionBeat} → ${endShot.actionBeat}`.trim(),
      outputRole: "transition",
      continuityHintKey: "studio.executionPlan.continuity.actionBeat",
    });
  }

  return { jobs, missing, warnings };
}

function buildHybridJobs(params: {
  storyboard: StudioStoryboardDetail;
  animationPlan: StudioAnimationPlan;
}): {
  jobs: ViduExecutionJob[];
  missing: ViduExecutionMissingRequirement[];
  warnings: ViduExecutionWarning[];
  unsupportedHybridPieces: boolean;
} {
  const scenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const animById = new Map(params.animationPlan.scenes.map((s) => [s.sceneId, s]));
  const jobs: ViduExecutionJob[] = [];
  const missing: ViduExecutionMissingRequirement[] = [];
  const warnings: ViduExecutionWarning[] = [];
  let unsupportedHybridPieces = false;

  let storyRun: StudioSceneDetail[] = [];

  const flushStoryRun = () => {
    if (storyRun.length === 0) return;
    const inputImages = storyRun.map((scene) =>
      buildInputImage({
        storyboard: params.storyboard,
        scene,
        imageRole: "scene_still",
      })
    );
    for (const img of inputImages.filter((i) => i.missing)) {
      missing.push({
        id: `hybrid-story-${img.sceneId}`,
        kind: "image",
        reasonKey: "studio.executionPlan.missing.sceneImage",
        reasonParams: { title: img.sceneTitle || String(img.sceneOrder + 1) },
        sceneOrder: img.sceneOrder,
        suggestedActionKey: "studio.executionPlan.suggest.generateImage",
      });
    }
    const duration = storyRun.reduce(
      (sum, s) => sum + (animById.get(s.id)?.targetDuration ?? 5),
      0
    );
    jobs.push({
      id: `hybrid-story-${storyRun[0]!.id}`,
      jobKind: "hybrid_story_segment",
      sceneIds: storyRun.map((s) => s.id),
      beatLabels: storyRun.map((s) => s.title || `scene-${s.order + 1}`),
      inputImages,
      durationSeconds: duration,
      promptIntent: storyRun.map((s) => promptIntentForScene(s)).join(" · "),
      promptIntentKey: "studio.executionPlan.prompt.storySegment",
      outputRole: "segment",
      continuityHintKey: "studio.executionPlan.continuity.storyFlow",
    });
    storyRun = [];
  };

  for (const scene of scenes) {
    const animScene = animById.get(scene.id);
    const hint = animScene?.shots[0]?.renderModeHint ?? "hybrid_story";

    if (sceneUsesActionExecution(hint)) {
      flushStoryRun();
      if (!animScene) {
        unsupportedHybridPieces = true;
        warnings.push({
          id: `hybrid-unsupported-${scene.id}`,
          messageKey: "studio.executionPlan.warning.unsupportedHybridScene",
          messageParams: { title: scene.title || String(scene.order + 1) },
        });
        continue;
      }
      const actionResult = buildActionJobsForScene({
        storyboard: params.storyboard,
        animScene,
        scene,
      });
      for (const job of actionResult.jobs) {
        jobs.push({ ...job, jobKind: "hybrid_action_segment" });
      }
      missing.push(...actionResult.missing);
      warnings.push(...actionResult.warnings);
    } else {
      storyRun.push(scene);
    }
  }
  flushStoryRun();

  return { jobs, missing, warnings, unsupportedHybridPieces };
}

function buildFallbackPlan(params: {
  executionMode: ViduExecutionMode;
  missing: ViduExecutionMissingRequirement[];
  renderPlan: StudioRenderStrategyPlan;
}): ViduExecutionFallbackPlan {
  const missingEndImages = params.missing.some(
    (m) => m.reasonKey === "studio.executionPlan.missing.endImage"
  );
  const missingAnyImages = params.missing.some((m) => m.kind === "image");

  if (
    params.executionMode === "action_chain" &&
    missingEndImages
  ) {
    return {
      active: true,
      fallbackMode: "generate_images_first",
      reasonKey: "studio.executionPlan.fallback.generateImagesFirst",
      reasonParams: { strategy: params.renderPlan.recommendedStrategy },
    };
  }

  if (params.executionMode === "action_chain" && missingAnyImages) {
    return {
      active: true,
      fallbackMode: "story_video",
      reasonKey: "studio.executionPlan.fallback.storyVideo",
    };
  }

  if (params.executionMode === "hybrid" && missingEndImages) {
    return {
      active: true,
      fallbackMode: "preview_only",
      reasonKey: "studio.executionPlan.fallback.previewOnly",
    };
  }

  return {
    active: false,
    fallbackMode: null,
    reasonKey: "studio.executionPlan.fallback.none",
  };
}

function buildReadiness(params: {
  jobs: ViduExecutionJob[];
  missing: ViduExecutionMissingRequirement[];
  fallback: ViduExecutionFallbackPlan;
  unsupportedHybridPieces: boolean;
}): ViduExecutionReadiness {
  const missingStartEndImages = params.missing.some(
    (m) =>
      m.reasonKey === "studio.executionPlan.missing.endImage" ||
      m.reasonKey === "studio.executionPlan.missing.startImage"
  );
  const planPresent = params.jobs.length > 0;
  const readyToRender =
    planPresent &&
    params.missing.length === 0 &&
    !params.unsupportedHybridPieces;

  return {
    planPresent,
    readyToRender,
    missingStartEndImages,
    unsupportedHybridPieces: params.unsupportedHybridPieces,
    fallbackActive: params.fallback.active,
  };
}

export function buildViduExecutionPlan(input: ViduExecutionPlanInput): ViduExecutionPlan {
  const storyboard = input.storyboard;
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

  const animationPlan =
    input.animationPlan ??
    buildStudioAnimationPlan({
      storyboard,
      renderStrategyPlan: renderPlan,
      characters: input.characters,
      locations: input.locations,
      props: input.props,
      worlds: input.worlds,
      projectMemory: input.projectMemory,
      styleProfile,
      directorProfile,
    });

  const audioMixPlan =
    input.audioMixPlan ??
    buildStoryboardAudioMixPlan({
      storyboard,
      userLibrary: [],
      voiceAudioUrl: null,
    });

  const executionMode = mapStrategyToExecutionMode(renderPlan.recommendedStrategy);
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const animById = new Map(animationPlan.scenes.map((s) => [s.sceneId, s]));

  let jobs: ViduExecutionJob[] = [];
  let missing: ViduExecutionMissingRequirement[] = [];
  let warnings: ViduExecutionWarning[] = [];
  let unsupportedHybridPieces = false;

  if (executionMode === "story_video") {
    const storyResult = buildStoryVideoJobs({ storyboard, animationPlan });
    jobs = storyResult.jobs;
    missing = storyResult.missing;
  } else if (executionMode === "action_chain") {
    for (const scene of scenes) {
      const animScene = animById.get(scene.id);
      if (!animScene) continue;
      const result = buildActionJobsForScene({
        storyboard,
        animScene,
        scene,
      });
      jobs.push(...result.jobs);
      missing.push(...result.missing);
      warnings.push(...result.warnings);
    }
    if (jobs.length === 0 && scenes.length > 0) {
      const storyResult = buildStoryVideoJobs({ storyboard, animationPlan });
      jobs = storyResult.jobs;
      missing = storyResult.missing;
      warnings.push({
        id: "warn-action-fallback-story",
        messageKey: "studio.executionPlan.warning.actionFallbackStory",
      });
    }
  } else {
    const hybridResult = buildHybridJobs({ storyboard, animationPlan });
    jobs = hybridResult.jobs;
    missing = hybridResult.missing;
    warnings = hybridResult.warnings;
    unsupportedHybridPieces = hybridResult.unsupportedHybridPieces;
  }

  const fallbackPlan = buildFallbackPlan({
    executionMode,
    missing,
    renderPlan,
  });

  const readiness = buildReadiness({
    jobs,
    missing,
    fallback: fallbackPlan,
    unsupportedHybridPieces,
  });

  const usesMultipleSteps = jobs.length > 1 || executionMode !== "story_video";
  const estimatedDurationSeconds = jobs.reduce((sum, j) => sum + j.durationSeconds, 0);

  const directorContextLines = [
    `execution:${executionMode}`,
    `jobs:${jobs.length}`,
    missing.length > 0 ? `gaps:${missing.length}` : "",
    fallbackPlan.active ? `fallback:${fallbackPlan.fallbackMode}` : "",
    audioMixPlan.mixReady ? "audio:ready" : "",
  ].filter(Boolean);

  return {
    executionMode,
    executionModeLabelKey: MODE_LABEL[executionMode],
    approachSummaryKey: APPROACH_SUMMARY[executionMode],
    usesMultipleSteps,
    jobs,
    missingRequirements: missing.slice(0, 12),
    warnings: warnings.slice(0, 8),
    fallbackPlan,
    readiness,
    audioMixIncluded: Boolean(storyboard.musicEnabled || storyboard.soundEnabled || storyboard.voiceEnabled),
    audioMixReady: audioMixPlan.mixReady,
    totalJobCount: jobs.length,
    estimatedDurationSeconds,
    directorContextLines,
  };
}
