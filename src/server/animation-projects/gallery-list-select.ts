import type { Prisma } from "@prisma/client";

/** Fields always present on AnimationProject (safe for pre-rebuild-meta DBs). */
export const galleryListProjectSelectLegacy = {
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  projectType: true,
  stylePreset: true,
  instantOutputDurationSeconds: true,
  instantSelectedChips: true,
  instantUserIntent: true,
  presetId: true,
  intent: true,
  advancedSettingsEnabled: true,
  viduResolution: true,
  viduDurationSeconds: true,
  estimatedCredits: true,
  images: {
    orderBy: { order: "asc" as const },
    take: 1,
    select: { previewUrl: true },
  },
  _count: { select: { images: true, transitions: true } },
  transitions: {
    orderBy: { order: "asc" as const },
    select: {
      status: true,
      outputVideoUrl: true,
    },
  },
  exports: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      status: true,
      progress: true,
      outputVideoUrl: true,
      errorMessage: true,
    },
  },
} as const satisfies Prisma.AnimationProjectSelect;

export const galleryListProjectSelectWithRebuild = {
  ...galleryListProjectSelectLegacy,
  instantPreviousFinalVideoUrl: true,
  instantFinalRebuildCount: true,
  instantFinalRebuiltAt: true,
  instantFinalRebuildStatus: true,
} as const satisfies Prisma.AnimationProjectSelect;

export function galleryListSelectForAdmin(
  listAll: boolean
): Prisma.AnimationProjectSelect {
  if (listAll) {
    return {
      ...galleryListProjectSelectWithRebuild,
      owner: { select: { email: true } },
    };
  }
  return galleryListProjectSelectWithRebuild;
}
