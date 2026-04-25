import {
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { prisma } from "@/lib/prisma";
import { getSelectedAnimationProviderId, getVideoProvider } from "@/server/video-providers";

const ACTIVE_TRANSITION_STATUSES = ["queued", "generating"] as const;
const TERMINAL_TRANSITION_STATUSES = ["completed", "failed"] as const;

function getTransitionPrompt(stylePreset: string | null): string {
  return stylePreset
    ? `Create a smooth transition in ${stylePreset} style.`
    : "Create a smooth cinematic transition.";
}

function isTerminalStatus(status: string): boolean {
  return TERMINAL_TRANSITION_STATUSES.includes(
    status as (typeof TERMINAL_TRANSITION_STATUSES)[number]
  );
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

export async function startTransitionJob(transitionId: string) {
  const transition = await prisma.animationTransition.findUnique({
    where: { id: transitionId },
    include: {
      project: true,
    },
  });

  if (!transition) {
    throw new Error("Transition not found.");
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

  const provider = getVideoProvider();
  const jobSettings = resolveProviderJobSettings(transition.project);
  let providerResult;
  try {
    providerResult = await provider.createStartEndVideoJob({
      transitionId: transition.id,
      projectId: transition.projectId,
      startImageUrl: startImage.previewUrl,
      endImageUrl: endImage.previewUrl,
      prompt: getTransitionPrompt(transition.project.stylePreset),
      durationSeconds: jobSettings.providerDurationSeconds,
      aspectRatio: transition.project.aspectRatio ?? "16:9",
      stylePreset: transition.project.stylePreset ?? "homecheff-motion",
      providerModel: jobSettings.providerModel,
      providerResolution: jobSettings.providerResolution,
      providerDurationSeconds: jobSettings.providerDurationSeconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video provider create failed.";
    await prisma.animationTransition.update({
      where: { id: transition.id },
      data: {
        status: "failed",
        errorMessage: message,
        provider: getSelectedAnimationProviderId(),
      },
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

  return updatedTransition;
}

export async function pollTransitionJob(transitionId: string) {
  const transition = await prisma.animationTransition.findUnique({
    where: { id: transitionId },
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

  const updatedTransition = await prisma.animationTransition.update({
    where: { id: transition.id },
    data: {
      status: providerStatus.status,
      progress: providerStatus.progress,
      outputVideoUrl: providerStatus.outputVideoUrl,
      errorMessage: providerStatus.errorMessage ?? null,
    },
  });

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

  if (anyFailed) {
    await prisma.animationProject.update({
      where: { id: project.id },
      data: { status: "failed" },
    });
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
