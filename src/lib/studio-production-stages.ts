/**
 * S2F — Human production stages (Verhaal / Beeld / Personen / Geluid / Afronden).
 * UI mental model only — maps onto existing StudioToolId surfaces. No new pipelines.
 */

import type { StudioToolId } from "@/lib/studio-tool-id";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export const STUDIO_PRODUCTION_STAGE_IDS = [
  "story",
  "visuals",
  "entities",
  "sound",
  "finish",
] as const;

export type StudioProductionStageId = (typeof STUDIO_PRODUCTION_STAGE_IDS)[number];

export type StudioStageReadinessStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "READY"
  | "NEEDS_ATTENTION";

export type StudioStageIssueSeverity = "blocking" | "warning";

export type StudioStageIssue = {
  code: string;
  severity: StudioStageIssueSeverity;
  stageId: StudioProductionStageId;
  sceneId?: string | null;
};

export type StudioStageStatus = {
  stageId: StudioProductionStageId;
  status: StudioStageReadinessStatus;
};

export type StudioProductionReadiness = {
  overallStatus: StudioStageReadinessStatus;
  stages: StudioStageStatus[];
  blockingIssues: StudioStageIssue[];
  warnings: StudioStageIssue[];
  recommendedNextStage: StudioProductionStageId;
  recommendedActionCode: string;
  providerCalls: 0;
};

/** Tools shown in the primary strip for each human stage. */
export const STAGE_PRIMARY_TOOLS: Record<StudioProductionStageId, StudioToolId[]> = {
  story: ["story", "text", "creativeDirector"],
  visuals: ["visual", "consistency", "continuity"],
  entities: ["characters", "locations", "props", "world"],
  sound: ["voice", "music", "sound", "subtitles", "translate"],
  finish: ["render", "versions", "export", "production"],
};

/** Default tool when entering a stage. */
export const STAGE_DEFAULT_TOOL: Record<StudioProductionStageId, StudioToolId> = {
  story: "story",
  visuals: "visual",
  entities: "characters",
  sound: "voice",
  finish: "render",
};

export function isStudioProductionStageId(value: string): value is StudioProductionStageId {
  return (STUDIO_PRODUCTION_STAGE_IDS as readonly string[]).includes(value);
}

export function stageForTool(tool: StudioToolId): StudioProductionStageId {
  for (const stageId of STUDIO_PRODUCTION_STAGE_IDS) {
    if (STAGE_PRIMARY_TOOLS[stageId].includes(tool)) {
      return stageId;
    }
  }
  // Advanced / direct tools → keep user in story unless finish-related
  if (tool === "insights" || tool === "creationAssistant" || tool === "creativeReview") {
    return "story";
  }
  if (tool === "productionHistory" || tool === "storyArchitecture" || tool === "directorPreferences") {
    return "story";
  }
  return "story";
}

export function toolsForStage(stageId: StudioProductionStageId): StudioToolId[] {
  return STAGE_PRIMARY_TOOLS[stageId];
}

export function defaultToolForStage(stageId: StudioProductionStageId): StudioToolId {
  return STAGE_DEFAULT_TOOL[stageId];
}

function sceneHasVisual(scene: StudioStoryboardDetail["scenes"][number]): boolean {
  return Boolean(scene.selectedSceneImageId) || (scene.sceneImages?.length ?? 0) > 0;
}

function sceneHasStoryContent(scene: StudioStoryboardDetail["scenes"][number]): boolean {
  return Boolean(
    scene.title?.trim() ||
      scene.action?.trim() ||
      scene.description?.trim()
  );
}

/**
 * Pure readiness from project data — 0 provider calls, no side effects.
 */
export function resolveStudioProductionReadiness(
  storyboard: Pick<
    StudioStoryboardDetail,
    "id" | "scenes" | "voiceEnabled" | "musicEnabled" | "soundEnabled" | "voiceNarrationScript"
  >
): StudioProductionReadiness {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const blocking: StudioStageIssue[] = [];
  const warnings: StudioStageIssue[] = [];

  if (scenes.length === 0) {
    blocking.push({
      code: "NO_SCENES",
      severity: "blocking",
      stageId: "story",
    });
  }

  const storyReadyCount = scenes.filter(sceneHasStoryContent).length;
  if (scenes.length > 0 && storyReadyCount === 0) {
    blocking.push({
      code: "STORY_EMPTY",
      severity: "blocking",
      stageId: "story",
    });
  } else if (scenes.length > 0 && storyReadyCount < scenes.length) {
    warnings.push({
      code: "STORY_PARTIAL",
      severity: "warning",
      stageId: "story",
    });
  }

  const missingVisuals = scenes.filter((s) => !sceneHasVisual(s));
  for (const scene of missingVisuals) {
    blocking.push({
      code: "SCENE_MISSING_VISUAL",
      severity: "blocking",
      stageId: "visuals",
      sceneId: scene.id,
    });
  }

  const scenesNeedingPeople = scenes.filter(
    (s) => s.characters.length === 0 && Boolean(s.action?.trim() || s.description?.trim())
  );
  if (scenesNeedingPeople.length > 0 && scenes.some((s) => s.characters.length > 0)) {
    warnings.push({
      code: "CHARACTERS_PARTIAL",
      severity: "warning",
      stageId: "entities",
    });
  }

  const hasAnyCharacter = scenes.some((s) => s.characters.length > 0);
  const hasAnyLocation = scenes.some((s) => Boolean(s.locationId || s.location));
  if (scenes.length > 0 && !hasAnyCharacter && !hasAnyLocation) {
    warnings.push({
      code: "ENTITIES_EMPTY",
      severity: "warning",
      stageId: "entities",
    });
  }

  if (
    storyboard.voiceEnabled &&
    !storyboard.voiceNarrationScript?.trim()
  ) {
    warnings.push({
      code: "VOICE_ENABLED_NO_SCRIPT",
      severity: "warning",
      stageId: "sound",
    });
  }

  const stageStatus = (stageId: StudioProductionStageId): StudioStageReadinessStatus => {
    const stageBlocking = blocking.filter((i) => i.stageId === stageId);
    const stageWarnings = warnings.filter((i) => i.stageId === stageId);
    if (stageBlocking.length > 0) return "NEEDS_ATTENTION";
    if (stageId === "story") {
      if (scenes.length === 0) return "NOT_STARTED";
      if (storyReadyCount === scenes.length) return "READY";
      return "IN_PROGRESS";
    }
    if (stageId === "visuals") {
      if (scenes.length === 0) return "NOT_STARTED";
      if (missingVisuals.length === 0) return "READY";
      if (missingVisuals.length === scenes.length) return "NOT_STARTED";
      return "IN_PROGRESS";
    }
    if (stageId === "entities") {
      if (!hasAnyCharacter && !hasAnyLocation) return "NOT_STARTED";
      if (stageWarnings.length > 0) return "IN_PROGRESS";
      return "READY";
    }
    if (stageId === "sound") {
      if (
        !storyboard.voiceEnabled &&
        !storyboard.musicEnabled &&
        !storyboard.soundEnabled
      ) {
        return "READY"; // intentionally silent is valid
      }
      if (stageWarnings.length > 0) return "IN_PROGRESS";
      return "READY";
    }
    // finish
    if (blocking.length > 0) return "NEEDS_ATTENTION";
    if (warnings.length > 0) return "IN_PROGRESS";
    if (scenes.length === 0) return "NOT_STARTED";
    return "READY";
  };

  const stages: StudioStageStatus[] = STUDIO_PRODUCTION_STAGE_IDS.map((stageId) => ({
    stageId,
    status: stageStatus(stageId),
  }));

  let recommendedNextStage: StudioProductionStageId = "story";
  if (scenes.length === 0 || storyReadyCount === 0) {
    recommendedNextStage = "story";
  } else if (missingVisuals.length > 0) {
    recommendedNextStage = "visuals";
  } else if (!hasAnyCharacter && !hasAnyLocation) {
    recommendedNextStage = "entities";
  } else if (
    storyboard.voiceEnabled &&
    !storyboard.voiceNarrationScript?.trim()
  ) {
    recommendedNextStage = "sound";
  } else if (blocking.length === 0) {
    recommendedNextStage = "finish";
  } else {
    recommendedNextStage = stages.find((s) => s.status === "NEEDS_ATTENTION")?.stageId ?? "story";
  }

  const recommendedActionCode =
    recommendedNextStage === "story" && scenes.length === 0
      ? "ADD_FIRST_SCENE"
      : recommendedNextStage === "visuals"
        ? "CREATE_SCENE_VISUAL"
        : recommendedNextStage === "entities"
          ? "LINK_CHARACTERS_OR_LOCATIONS"
          : recommendedNextStage === "sound"
            ? "COMPLETE_SOUND"
            : recommendedNextStage === "finish"
              ? "MAKE_VIDEO"
              : "CONTINUE_STORY";

  const overallStatus: StudioStageReadinessStatus =
    blocking.length > 0
      ? "NEEDS_ATTENTION"
      : stages.every((s) => s.status === "READY")
        ? "READY"
        : scenes.length === 0
          ? "NOT_STARTED"
          : "IN_PROGRESS";

  return {
    overallStatus,
    stages,
    blockingIssues: blocking,
    warnings,
    recommendedNextStage,
    recommendedActionCode,
    providerCalls: 0,
  };
}

export type ContinueStageLandingInput = {
  readiness: StudioProductionReadiness;
  /** Explicit deep-link stage wins when valid. */
  explicitStage?: string | null;
  /** Saved place stage from session. */
  savedStage?: StudioProductionStageId | null;
  lifecycleClass?: string | null;
  sourcePresetId?: string | null;
};

/**
 * Deterministic first stage for Continue-in-Studio / workspace open.
 */
export function resolveContinueStageLanding(
  input: ContinueStageLandingInput
): StudioProductionStageId {
  if (input.explicitStage && isStudioProductionStageId(input.explicitStage)) {
    return input.explicitStage;
  }

  const lifecycle = (input.lifecycleClass ?? "").toUpperCase();
  const source = (input.sourcePresetId ?? "").toLowerCase();

  // Prefer readiness gaps over origin heuristics
  const rec = input.readiness.recommendedNextStage;
  if (rec !== "finish" || input.readiness.overallStatus !== "READY") {
    // Origin nudges only when readiness is early / empty-ish
    if (
      input.readiness.stages.find((s) => s.stageId === "story")?.status === "NOT_STARTED"
    ) {
      return "story";
    }
    if (
      (source.includes("red_carpet") || source.includes("outfit") || lifecycle.includes("IMAGE")) &&
      input.readiness.stages.find((s) => s.stageId === "visuals")?.status !== "READY"
    ) {
      return "visuals";
    }
    if (lifecycle.includes("COMMERCIAL") || lifecycle.includes("MULTI_SCENE")) {
      return rec;
    }
    return rec;
  }

  if (input.savedStage) {
    return input.savedStage;
  }

  return "finish";
}

export const STAGE_LABEL_KEYS = {
  story: "studio.productionStage.story",
  visuals: "studio.productionStage.visuals",
  entities: "studio.productionStage.entities",
  sound: "studio.productionStage.sound",
  finish: "studio.productionStage.finish",
} as const;

export const STAGE_STATUS_LABEL_KEYS = {
  NOT_STARTED: "studio.productionStage.status.notStarted",
  IN_PROGRESS: "studio.productionStage.status.inProgress",
  READY: "studio.productionStage.status.ready",
  NEEDS_ATTENTION: "studio.productionStage.status.needsAttention",
} as const;
