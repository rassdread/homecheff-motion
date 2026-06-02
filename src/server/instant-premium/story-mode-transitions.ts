import { prisma } from "@/lib/prisma";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";

export const STORY_MODE_PRIMARY_TRANSITION_ORDER = 0;

/** One multiframe Vidu job per story project. */
export const STORY_MODE_MULTIFRAME_ROW_COUNT = 1;

export function isStoryInstantMode(instantMode: string | null | undefined): boolean {
  return parseInstantMode(instantMode) === "story";
}

/**
 * Transition rows stored for a project.
 * Story multiframe: always 1 row (first→last image anchors).
 * Transition mode: N−1 adjacent pairs.
 */
export function expectedTransitionRowCount(
  imageCount: number,
  instantMode?: string | null
): number {
  if (isStoryInstantMode(instantMode) && imageCount >= 2) {
    return STORY_MODE_MULTIFRAME_ROW_COUNT;
  }
  return Math.max(0, imageCount - 1);
}

/** Provider clips concatenated in final assembly (same as row count per mode). */
export function expectedAssemblySegmentCount(
  imageCount: number,
  instantMode?: string | null
): number {
  return expectedTransitionRowCount(imageCount, instantMode);
}

export function getStoryModePrimaryTransition<
  T extends { order?: number; transitionOrder?: number },
>(transitions: T[]): T | undefined {
  return transitions.find(
    (t) => (t.order ?? t.transitionOrder) === STORY_MODE_PRIMARY_TRANSITION_ORDER
  );
}

/** Story assembly uses one multiframe clip — only validate that row for provider blob checks. */
export function selectTransitionsForProviderStorageValidation<
  T extends { order: number },
>(instantMode: string | null | undefined, transitions: T[]): T[] {
  if (!isStoryInstantMode(instantMode)) {
    return transitions;
  }
  const primary = getStoryModePrimaryTransition(transitions);
  if (primary) {
    return [primary];
  }
  const orderZero = transitions.filter((t) => t.order === STORY_MODE_PRIMARY_TRANSITION_ORDER);
  return orderZero.length > 0 ? orderZero : transitions.slice(0, 1);
}

export function storyModeClipsReadyForMerge(
  instantMode: string | null | undefined,
  transitions: Array<{ order: number; status: string; outputVideoUrl: string | null }>
): boolean {
  if (!isStoryInstantMode(instantMode)) {
    return (
      transitions.length > 0 &&
      transitions.every((t) => t.status === "completed" && Boolean(t.outputVideoUrl?.trim()))
    );
  }
  const primary = getStoryModePrimaryTransition(transitions);
  return Boolean(primary?.status === "completed" && primary.outputVideoUrl?.trim());
}

/**
 * Story projects should have exactly one multiframe transition row.
 * Removes accidental extra rows from older repair attempts; ensures one spanning row exists.
 */
export async function ensureStoryModeTransitionRows(projectId: string): Promise<{
  created: number;
  updated: number;
  removed: number;
  imageCount: number;
  transitionCount: number;
}> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
    },
  });
  if (!project || !isStoryInstantMode(project.instantMode)) {
    return { created: 0, updated: 0, removed: 0, imageCount: 0, transitionCount: 0 };
  }

  const images = project.images;
  if (images.length < 2) {
    return {
      created: 0,
      updated: 0,
      removed: 0,
      imageCount: images.length,
      transitionCount: project.transitions.length,
    };
  }

  let created = 0;
  let updated = 0;
  let removed = 0;
  const firstId = images[0]!.id;
  const lastId = images[images.length - 1]!.id;
  const primary =
    getStoryModePrimaryTransition(project.transitions) ?? project.transitions[0];

  const extras = project.transitions.filter(
    (t) => t.id !== primary?.id && t.order !== STORY_MODE_PRIMARY_TRANSITION_ORDER
  );
  for (const extra of extras) {
    await prisma.animationTransition.delete({ where: { id: extra.id } });
    removed += 1;
  }

  if (!primary) {
    await prisma.animationTransition.create({
      data: {
        projectId,
        startImageId: firstId,
        endImageId: lastId,
        order: STORY_MODE_PRIMARY_TRANSITION_ORDER,
        status: "queued",
        progress: 0,
      },
    });
    created = 1;
  } else if (primary.startImageId !== firstId || primary.endImageId !== lastId) {
    await prisma.animationTransition.update({
      where: { id: primary.id },
      data: {
        startImageId: firstId,
        endImageId: lastId,
        order: STORY_MODE_PRIMARY_TRANSITION_ORDER,
      },
    });
    updated = 1;
  }

  const transitionCount = await prisma.animationTransition.count({ where: { projectId } });
  return {
    created,
    updated,
    removed,
    imageCount: images.length,
    transitionCount,
  };
}
