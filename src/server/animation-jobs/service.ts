import type { AnimationTransition } from "@prisma/client";
import { resolveGlobalPromptContext } from "@/lib/animation-global-prompt-context";
import { ANIMATION_INTENTS, normalizeAnimationIntent } from "@/lib/animation-intents";
import {
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { normalizeTextRenderMode } from "@/lib/hybrid-motion-overlay";
import {
  normalizeInstantTransitionSeconds,
  parseInstantMode,
  parseInstantSceneTexts,
  viduMultiframeSegmentDurationSeconds,
} from "@/lib/instant-premium-mode-types";
import { STORY_MODE_PRIMARY_TRANSITION_ORDER } from "@/server/instant-premium/story-mode-transitions";
import {
  hasPerSceneDurations,
  resolveViduSegmentDurationsFromStoryboard,
} from "@/lib/story-overlay-templates";
import { resolveExecutionPromptsBySceneIndex } from "@/lib/studio-scene-execution";
import { parseMotionHandoffPayloadForStorage } from "@/lib/studio-motion-handoff-storage";
import {
  buildInstantStoryModePromptDetailed,
  buildStoryModeBudgetedViduPrompt,
  buildInstantVideoPrompt,
  instantPremiumTransitionSegmentHint,
  isInstantPremiumStylePreset,
  parseStoredInstantUserIntent,
  parseStoredStoryContinuityStrength,
  type InstantPremiumAspectRatio,
  type InstantPremiumDurationSeconds,
  type InstantPremiumStylePreset,
} from "@/lib/instant-premium-prompt";
import {
  createEmptyStoryModeDebugReport,
  isStoryModeDebugEnabled,
  logStoryModeDebugReport,
  stashStoryModeDebugReport,
} from "@/lib/story-mode-debug";
import { premiumMotionProfileFromPosterSettings } from "@/lib/premium-motion-engine";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { scoreKeyframePairQuick } from "@/lib/exact-frame-continuity";
import {
  buildBudgetedViduPrompt,
  validateViduPromptLength,
  VIDU_PROMPT_HARD_MAX_CHARS,
} from "@/lib/vidu-prompt-budget";
import { prisma } from "@/lib/prisma";
import { markFullRerenderFailedIfRunning } from "@/server/instant-premium/full-rerender-project";
import { getSelectedAnimationProviderId, getVideoProvider } from "@/server/video-providers";
import { ensureTransitionOutputInBlob } from "@/server/animation-projects/ensure-transition-blob";
import {
  beginProviderUsageLog,
  completeProviderUsageLog,
  logFailedProviderStart,
  resolveRenderTypeForProject,
} from "@/server/provider-usage/provider-usage-log";

const ACTIVE_TRANSITION_STATUSES = ["queued", "generating", "processing", "rendering"] as const;
const TERMINAL_TRANSITION_STATUSES = ["completed", "failed"] as const;

const SEQUENCE_SEAM_HINT = `This is part of a continuous sequence. The transformation must match the previous and next steps seamlessly.`;

const SAME_SUBJECT_HINT =
  "The transformation must feel like the same subject continuing through time, not separate scenes.";

function transitionPositionHint(order: number, total: number): string {
  if (total <= 1) {
    return "This is the beginning of the sequence.";
  }
  if (order === 0) {
    return "This is the beginning of the sequence.";
  }
  if (order === total - 1) {
    return "This completes the transformation.";
  }
  return "This continues the evolving sequence.";
}

/** Global continuity framing first, then preset, intent, user; seam + identity + optional step hints last. */
export function combineAnimationPrompt(params: {
  globalPrompt: string;
  presetPrompt: string;
  intentPrompt?: string | null;
  userPrompt?: string | null | undefined;
  /** 0-based transition order; pass with transitionTotal for step hints. */
  transitionOrder?: number;
  /** Total transitions in the project. */
  transitionTotal?: number;
}): string {
  let result = params.globalPrompt.trim();

  result += `\n${params.presetPrompt.trim()}`;

  const intent = params.intentPrompt?.trim() ?? "";
  if (intent) {
    result += `\n${intent}`;
  }

  const extra = params.userPrompt?.trim() ?? "";
  if (extra) {
    result += `\nUser direction: ${extra}`;
  }

  result += `\n${SEQUENCE_SEAM_HINT}`;

  result += `\n${SAME_SUBJECT_HINT}`;

  const { transitionOrder, transitionTotal } = params;
  if (
    typeof transitionOrder === "number" &&
    Number.isFinite(transitionOrder) &&
    typeof transitionTotal === "number" &&
    transitionTotal >= 1 &&
    transitionOrder >= 0 &&
    transitionOrder < transitionTotal
  ) {
    result += `\n${transitionPositionHint(transitionOrder, transitionTotal)}`;
  }

  return result;
}

function isTerminalStatus(status: string): boolean {
  return TERMINAL_TRANSITION_STATUSES.includes(
    status as (typeof TERMINAL_TRANSITION_STATUSES)[number]
  );
}

function parseInstantPremiumChipsJson(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((x): x is string => typeof x === "string");
}

function resolveInstantPremiumStyle(stylePreset: string | null | undefined): InstantPremiumStylePreset {
  const s = stylePreset?.trim() ?? "";
  if (isInstantPremiumStylePreset(s)) {
    return s;
  }
  return "food_promo";
}

function resolveInstantPremiumAspect(
  aspectRatio: string | null | undefined
): InstantPremiumAspectRatio {
  const a = aspectRatio?.trim();
  if (a === "16:9" || a === "9:16") {
    return a;
  }
  return "9:16";
}

function resolveInstantPremiumDuration(
  seconds: number | null | undefined
): InstantPremiumDurationSeconds {
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
    return seconds;
  }
  return 8;
}

function resolveProviderJobSettings(project: {
  presetId: string;
  viduModel: string | null;
  viduResolution: string | null;
  viduDurationSeconds: number | null;
}): {
  providerModel: string;
  providerResolution: string;
  providerDurationSeconds: number;
} {
  const presetId: AnimationPresetId = validateAnimationPresetId(project.presetId)
    ? project.presetId
    : "standard";
  const preset = getAnimationPreset(presetId);
  return {
    providerModel: project.viduModel ?? preset.model,
    providerResolution: project.viduResolution ?? preset.resolution,
    providerDurationSeconds: project.viduDurationSeconds ?? preset.durationSeconds,
  };
}

export async function startTransitionJob(transitionId: string): Promise<AnimationTransition> {
  const claimed = await prisma.animationTransition.updateMany({
    where: { id: transitionId, status: "queued", providerJobId: null },
    data: { status: "generating", progress: 1, errorMessage: null },
  });

  const transition = await prisma.animationTransition.findUnique({
    where: { id: transitionId },
    include: {
      project: {
        include: {
          _count: {
            select: { transitions: true },
          },
        },
      },
    },
  });

  if (!transition) {
    throw new Error("Transition not found.");
  }
  if (claimed.count === 0) {
    if (transition.providerJobId?.trim()) {
      return pollTransitionJob(transition.id);
    }
    if (isTerminalStatus(transition.status)) {
      return transition;
    }
    if (transition.status === "generating" && !transition.providerJobId?.trim()) {
      await prisma.animationTransition.update({
        where: { id: transitionId },
        data: { status: "queued", progress: 0, errorMessage: null },
      });
      return startTransitionJob(transitionId);
    }
    if (transition.status === "generating") {
      return transition;
    }
  }

  const instantModeEarly = parseInstantMode(transition.project.instantMode);
  if (
    transition.project.projectType === "instant_premium" &&
    instantModeEarly === "story" &&
    transition.order > STORY_MODE_PRIMARY_TRANSITION_ORDER
  ) {
    return transition;
  }

  const [startImage, endImage] = await Promise.all([
    prisma.animationImage.findUnique({ where: { id: transition.startImageId } }),
    prisma.animationImage.findUnique({ where: { id: transition.endImageId } }),
  ]);

  if (!startImage || !endImage) {
    throw new Error("Transition images not found.");
  }

  if (!startImage.previewUrl || !endImage.previewUrl) {
    throw new Error("Transition images are missing preview URLs.");
  }

  const startViduUrl = startImage.viduInputUrl?.trim() || startImage.previewUrl;
  const endViduUrl = endImage.viduInputUrl?.trim() || endImage.previewUrl;
  const textRenderMode = normalizeTextRenderMode(transition.project.instantTextRenderMode);
  const posterMotionActive = textRenderMode === "poster_motion_preserve";
  const bakedTextProtectionActive =
    !posterMotionActive &&
    (startImage.bakedTextProtectionStatus === "masked" ||
      endImage.bakedTextProtectionStatus === "masked");
  const hybridOverlayActive =
    bakedTextProtectionActive &&
    (textRenderMode === "deevid_text_safe" ||
      textRenderMode === "hybrid_overlay" ||
      textRenderMode === "exact_freeze");

  const transitionTotal = transition.project._count.transitions;
  const isInstantPremium = transition.project.projectType === "instant_premium";
  const instantMode = parseInstantMode(transition.project.instantMode);
  const isStoryMode = isInstantPremium && instantMode === "story";

  const orderedProjectImages = isStoryMode ?
    await prisma.animationImage.findMany({
      where: { projectId: transition.projectId },
      orderBy: { order: "asc" },
    })
  : [];

  const imageCount = isStoryMode ? orderedProjectImages.length : transitionTotal + 1;
  const instantStoredIntent = parseStoredInstantUserIntent(transition.project.instantUserIntent);

  const polishSettings = transition.project.instantPosterMotionSettings;
  const motionProfile = premiumMotionProfileFromPosterSettings(polishSettings);
  const polishProfile = resolvePremiumPolishProfile(polishSettings);
  let exactFrameContinuation = false;
  if (isInstantPremium && transition.order > 0) {
    const prevTransition = await prisma.animationTransition.findFirst({
      where: { projectId: transition.projectId, order: transition.order - 1 },
      select: { endImageId: true },
    });
    if (prevTransition) {
      const prevEndImage = await prisma.animationImage.findUnique({
        where: { id: prevTransition.endImageId },
        select: { previewUrl: true },
      });
      const pairScore = scoreKeyframePairQuick({
        endImageId: prevTransition.endImageId,
        startImageId: transition.startImageId,
        endPreviewUrl: prevEndImage?.previewUrl ?? null,
        startPreviewUrl: startImage.previewUrl,
      });
      exactFrameContinuation = pairScore.mode === "continuation";
    }
  }
  let finalPrompt: string;
  if (isInstantPremium && isStoryMode) {
    const transitionSeconds = normalizeInstantTransitionSeconds(
      transition.project.instantTransitionSeconds
    );
    const sceneTexts = parseInstantSceneTexts(transition.project.instantSceneTexts);
    const storyBakedTextProtectionActive =
      !posterMotionActive &&
      orderedProjectImages.some((img) => img.bakedTextProtectionStatus === "masked");
    const aspectRatio = resolveInstantPremiumAspect(transition.project.aspectRatio);
    const storedHandoff = parseMotionHandoffPayloadForStorage(
      transition.project.studioHandoffJson
    );
    const studioExecutionPrompts = storedHandoff
      ? resolveExecutionPromptsBySceneIndex(storedHandoff, imageCount)
      : undefined;
    const storyDetailed = buildInstantStoryModePromptDetailed({
      userIntent: instantStoredIntent.text || null,
      imageCount,
      sceneTexts,
      transitionSeconds,
      stylePreset: resolveInstantPremiumStyle(transition.project.stylePreset),
      bakedTextProtectionActive: storyBakedTextProtectionActive,
      aspectRatio,
      continuityStrength: parseStoredStoryContinuityStrength(transition.project.instantUserIntent),
      studioExecutionPrompts,
    });
    const budgetedStory = buildStoryModeBudgetedViduPrompt({
      projectId: transition.projectId,
      detailed: storyDetailed,
    });
    finalPrompt = budgetedStory.prompt;
    const lengthCheck = validateViduPromptLength(finalPrompt, VIDU_PROMPT_HARD_MAX_CHARS);
    if (!lengthCheck.ok) {
      throw new Error(
        `VIDU_PROMPT_TOO_LONG: ${lengthCheck.debug.charsAfter} chars (max ${VIDU_PROMPT_HARD_MAX_CHARS}). ` +
          `truncated=${lengthCheck.debug.truncatedBlocks.join(",")}`
      );
    }
    if (isStoryModeDebugEnabled()) {
      const report = {
        ...createEmptyStoryModeDebugReport({
          projectId: transition.projectId,
          transitionId: transition.id,
          imageCount,
          imageOrder: orderedProjectImages.map((img) => ({
            imageId: img.id,
            order: img.order,
          })),
        }),
        continuityStrength: storyDetailed.continuityStrength,
        characterContinuityBlock: storyDetailed.characterContinuityBlock,
        finalViduPrompt: finalPrompt,
        finalViduPromptChars: finalPrompt.length,
        promptBudget: {
          truncatedBlocks: budgetedStory.log.truncatedBlocks,
          droppedBlocks: budgetedStory.log.droppedBlocks,
        },
        scenes: storyDetailed.sceneMeta.map((meta, index) => ({
          sceneIndex: meta.sceneIndex,
          imageId: orderedProjectImages[index]?.id,
          imageOrder: orderedProjectImages[index]?.order,
          resolvedEmotion: meta.resolvedEmotion,
          emotionMode: meta.emotionMode,
          actingIntensity: meta.actingIntensity,
          storyCharacterRole: meta.characterRole.roleId,
          overlayTemplate: "skip" as const,
          overlayTextBlocks: [],
          overlayPositions: [],
          ocrBoxes: [],
          faceSafeZones: [],
          objectSafeZones: [],
          collisionWarnings: [],
        })),
      };
      stashStoryModeDebugReport(transition.projectId, report);
      logStoryModeDebugReport(report);
    }
  } else if (isInstantPremium) {
    const mainPrompt = buildInstantVideoPrompt({
      stylePreset: resolveInstantPremiumStyle(transition.project.stylePreset),
      duration: resolveInstantPremiumDuration(transition.project.instantOutputDurationSeconds),
      aspectRatio: resolveInstantPremiumAspect(transition.project.aspectRatio),
      userIntent: instantStoredIntent.text || null,
      selectedChips: parseInstantPremiumChipsJson(transition.project.instantSelectedChips),
      continuityStrength: instantStoredIntent.continuityStrength,
      lockedTextMode: transition.project.instantLockedTextMode !== false,
      bakedTextProtectionActive,
      hybridOverlayActive,
      posterMotionActive,
      textRenderMode,
      motionProfile,
      polishSettingsRaw: polishSettings,
      transitionOrder: transition.order,
      transitionTotal,
      exactFrameContinuation,
    });
    const segmentHint = instantPremiumTransitionSegmentHint({
      transitionOrder: transition.order,
      transitionTotal,
      imageCount,
      animationStyleId: polishProfile.animationStyleId,
      exactFrameContinuation,
    });
    const budgeted = buildBudgetedViduPrompt({
      projectId: transition.projectId,
      segmentIndex: transition.order,
      storyBlock: mainPrompt,
      motionBlock: "",
      segmentHint,
    });
    finalPrompt = budgeted.prompt;
    const lengthCheck = validateViduPromptLength(finalPrompt, VIDU_PROMPT_HARD_MAX_CHARS);
    if (!lengthCheck.ok) {
      throw new Error(
        `VIDU_PROMPT_TOO_LONG: ${lengthCheck.debug.charsAfter} chars (max ${VIDU_PROMPT_HARD_MAX_CHARS}). ` +
          `truncated=${lengthCheck.debug.truncatedBlocks.join(",")}`
      );
    }
  } else {
    finalPrompt = "";
  }

  if (!isInstantPremium) {
    finalPrompt =
      (() => {
        const presetId: AnimationPresetId = validateAnimationPresetId(transition.project.presetId)
          ? transition.project.presetId
          : "standard";
        const preset = getAnimationPreset(presetId);
        const intentId = normalizeAnimationIntent(transition.project.intent);
        const intentPrompt = ANIMATION_INTENTS[intentId].prompt;
        const globalPrompt = resolveGlobalPromptContext(transition.project.globalPromptContext);
        return combineAnimationPrompt({
          globalPrompt,
          presetPrompt: preset.prompt,
          intentPrompt,
          userPrompt: transition.project.userPrompt,
          transitionOrder: transition.order,
          transitionTotal,
        });
      })();
  }

  const provider = getVideoProvider();
  const jobSettings = resolveProviderJobSettings(transition.project);
  let providerResult;
  try {
    if (isStoryMode) {
      if (!provider.createMultiImageVideoJob) {
        throw new Error("Video provider does not support multi-image story mode.");
      }
      if (orderedProjectImages.length < 2) {
        throw new Error("Story mode requires at least two images.");
      }
      const transitionSeconds = normalizeInstantTransitionSeconds(
        transition.project.instantTransitionSeconds
      );
      const sceneTexts = parseInstantSceneTexts(transition.project.instantSceneTexts);
      const segmentDurations =
        hasPerSceneDurations(sceneTexts) ?
          resolveViduSegmentDurationsFromStoryboard(
            sceneTexts,
            orderedProjectImages.length,
            transitionSeconds
          )
        : orderedProjectImages.slice(1).map(() =>
            viduMultiframeSegmentDurationSeconds(transitionSeconds)
          );
      const firstUrl =
        orderedProjectImages[0].viduInputUrl?.trim() ||
        orderedProjectImages[0].previewUrl?.trim() ||
        "";
      if (!firstUrl) {
        throw new Error("Story mode start image is missing a preview URL.");
      }
      const segments = orderedProjectImages.slice(1).map((img, index) => {
        const url = img.viduInputUrl?.trim() || img.previewUrl?.trim() || "";
        if (!url) {
          throw new Error(`Story mode image ${index + 2} is missing a preview URL.`);
        }
        return {
          keyImageUrl: url,
          durationSeconds: segmentDurations[index] ?? viduMultiframeSegmentDurationSeconds(transitionSeconds),
        };
      });
      providerResult = await provider.createMultiImageVideoJob({
        transitionId: transition.id,
        projectId: transition.projectId,
        startImageUrl: firstUrl,
        segments,
        prompt: finalPrompt,
        aspectRatio: resolveInstantPremiumAspect(transition.project.aspectRatio),
        providerModel: jobSettings.providerModel,
        providerResolution: jobSettings.providerResolution,
      });
    } else {
      providerResult = await provider.createStartEndVideoJob({
        transitionId: transition.id,
        projectId: transition.projectId,
        startImageUrl: startViduUrl,
        endImageUrl: endViduUrl,
        prompt: finalPrompt,
        durationSeconds: jobSettings.providerDurationSeconds,
        aspectRatio: isInstantPremium
          ? resolveInstantPremiumAspect(transition.project.aspectRatio)
          : (transition.project.aspectRatio ?? "16:9"),
        stylePreset: isInstantPremium
          ? resolveInstantPremiumStyle(transition.project.stylePreset)
          : (transition.project.stylePreset ?? "homecheff-motion"),
        providerModel: jobSettings.providerModel,
        providerResolution: jobSettings.providerResolution,
        providerDurationSeconds: jobSettings.providerDurationSeconds,
      });
    }
    console.info("[hc-instant-premium]", {
      action: "start_queued_segment",
      projectId: transition.projectId,
      transitionId: transition.id,
      segmentIndex: transition.order,
      providerJobId: providerResult.providerJobId,
      statusBefore: "queued",
      statusAfter: providerResult.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video provider create failed.";
    const failedProvider = getSelectedAnimationProviderId();
    const failedJobSettings = resolveProviderJobSettings(transition.project);
    await prisma.animationTransition.update({
      where: { id: transition.id },
      data: {
        status: "failed",
        errorMessage: message,
        provider: failedProvider,
      },
    });
    if (failedProvider !== "mock") {
      await logFailedProviderStart({
        provider: failedProvider,
        projectId: transition.projectId,
        userId: transition.project.ownerId,
        renderType: resolveRenderTypeForProject(transition.project),
        durationSeconds: failedJobSettings.providerDurationSeconds,
        presetId: transition.project.presetId,
        estimatedCredits: transition.project.estimatedCredits,
        transitionCount: transition.project._count.transitions,
        viduDurationSeconds: transition.project.viduDurationSeconds,
        instantTransitionSeconds: transition.project.instantTransitionSeconds,
        errorMessage: message,
      }).catch((logErr) => {
        console.error("[provider-usage] logFailedProviderStart", logErr);
      });
    }
    console.info("[hc-instant-premium]", {
      action: "provider_start_failed",
      projectId: transition.projectId,
      transitionId: transition.id,
      segmentIndex: transition.order,
      error: message,
    });
    throw new Error(message);
  }

  const providerSlug = providerResult.providerKey ?? getSelectedAnimationProviderId();

  const updatedTransition = await prisma.animationTransition.update({
    where: { id: transition.id },
    data: {
      provider: providerSlug,
      providerJobId: providerResult.providerJobId,
      status: providerResult.status,
      progress: providerResult.status === "queued" ? 0 : transition.progress,
      errorMessage: null,
    },
  });

  if (providerSlug !== "mock" && providerResult.providerJobId?.trim()) {
    const startJobSettings = resolveProviderJobSettings(transition.project);
    await beginProviderUsageLog({
      provider: providerSlug,
      providerJobId: providerResult.providerJobId,
      projectId: transition.projectId,
      userId: transition.project.ownerId,
      renderType: resolveRenderTypeForProject(transition.project),
      durationSeconds: startJobSettings.providerDurationSeconds,
    }).catch((logErr) => {
      console.error("[provider-usage] beginProviderUsageLog", logErr);
    });
  }

  return updatedTransition;
}

export async function pollTransitionJob(transitionId: string): Promise<AnimationTransition> {
  const transition = await prisma.animationTransition.findUnique({
    where: { id: transitionId },
    include: {
      project: {
        select: {
          instantMode: true,
          projectType: true,
          sourceProjectId: true,
          presetId: true,
          estimatedCredits: true,
          viduModel: true,
          viduResolution: true,
          viduDurationSeconds: true,
          instantTransitionSeconds: true,
          _count: { select: { transitions: true } },
        },
      },
    },
  });

  if (!transition) {
    throw new Error("Transition not found.");
  }

  if (isTerminalStatus(transition.status)) {
    return transition;
  }

  if (!transition.providerJobId) {
    return startTransitionJob(transition.id);
  }

  const provider = getVideoProvider();
  let providerStatus;
  try {
    providerStatus = await provider.getVideoJobStatus(transition.providerJobId);
  } catch {
    return transition;
  }

  const wasTerminal = isTerminalStatus(transition.status);
  const isNowTerminal = isTerminalStatus(providerStatus.status);

  const updatedTransition = await prisma.animationTransition.update({
    where: { id: transition.id },
    data: {
      status: providerStatus.status,
      progress: providerStatus.progress,
      outputVideoUrl: providerStatus.outputVideoUrl,
      errorMessage: providerStatus.errorMessage ?? null,
    },
  });

  if (
    !wasTerminal &&
    isNowTerminal &&
    transition.providerJobId?.trim() &&
    (transition.provider ?? "vidu") !== "mock"
  ) {
    const pollJobSettings = resolveProviderJobSettings(transition.project);
    await completeProviderUsageLog({
      provider: transition.provider ?? "vidu",
      providerJobId: transition.providerJobId,
      status: providerStatus.status,
      durationSeconds: pollJobSettings.providerDurationSeconds,
      presetId: transition.project.presetId,
      viduDurationSeconds: transition.project.viduDurationSeconds,
      instantTransitionSeconds: transition.project.instantTransitionSeconds,
      estimatedCredits: transition.project.estimatedCredits,
      transitionCount: transition.project._count.transitions,
    }).catch((logErr) => {
      console.error("[provider-usage] completeProviderUsageLog", logErr);
    });
  }

  if (
    providerStatus.status === "completed" &&
    providerStatus.outputVideoUrl?.trim()
  ) {
    await ensureTransitionOutputInBlob(updatedTransition).catch((error) => {
      console.error("[pollTransitionJob]", {
        transitionId: transition.id,
        projectId: transition.projectId,
        message: error instanceof Error ? error.message : String(error),
      });
    });
    const afterBlob =
      (await prisma.animationTransition.findUnique({ where: { id: transition.id } })) ??
      updatedTransition;
    return (
      (await prisma.animationTransition.findUnique({ where: { id: transition.id } })) ??
      afterBlob
    );
  }

  return updatedTransition;
}

export async function startProjectJobs(projectId: string) {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: {
        where: { status: "queued" },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  await prisma.animationProject.update({
    where: { id: project.id },
    data: { status: "generating" },
  });

  const startedTransitions = await Promise.all(
    project.transitions.map((transition) => startTransitionJob(transition.id))
  );

  return {
    projectId: project.id,
    startedCount: startedTransitions.length,
  };
}

export async function startQueuedSegmentsWithoutJob(projectId: string): Promise<{
  projectId: string;
  queuedWithoutJobCount: number;
  startedCount: number;
}> {
  const queued = await prisma.animationTransition.findMany({
    where: { projectId, status: "queued", providerJobId: null },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  let startedCount = 0;
  for (const tr of queued) {
    try {
      const updated = await startTransitionJob(tr.id);
      if (updated.providerJobId?.trim()) {
        startedCount += 1;
      }
    } catch {
      // errors are persisted in transition row by startTransitionJob
    }
  }
  return { projectId, queuedWithoutJobCount: queued.length, startedCount };
}

export async function pollProjectJobs(projectId: string) {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: {
        where: {
          status: {
            in: [...ACTIVE_TRANSITION_STATUSES],
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  await Promise.all(project.transitions.map((transition) => pollTransitionJob(transition.id)));

  const allTransitions = await prisma.animationTransition.findMany({
    where: { projectId: project.id },
  });

  const anyFailed = allTransitions.some((transition) => transition.status === "failed");
  const allCompleted =
    allTransitions.length > 0 &&
    allTransitions.every((transition) => transition.status === "completed");
  const completedCount = allTransitions.filter((t) => t.status === "completed").length;
  const partialSegmentFailure =
    anyFailed && !allCompleted && completedCount > 0 && completedCount < allTransitions.length;

  if (partialSegmentFailure) {
    await prisma.animationProject.update({
      where: { id: project.id },
      data: { status: "generating" },
    });
  } else if (anyFailed) {
    await prisma.animationProject.update({
      where: { id: project.id },
      data: { status: "failed" },
    });
    await markFullRerenderFailedIfRunning(
      project.id,
      "One or more Vidu segment jobs failed during full rerender."
    );
  } else if (allCompleted) {
    await prisma.animationProject.update({
      where: { id: project.id },
      data: { status: "rendering" },
    });
  } else {
    await prisma.animationProject.update({
      where: { id: project.id },
      data: { status: "generating" },
    });
  }

  return {
    projectId: project.id,
    polledCount: project.transitions.length,
    anyFailed,
    allCompleted,
  };
}
