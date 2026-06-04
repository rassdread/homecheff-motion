import { prisma } from "@/lib/prisma";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import type { FullRerenderDraftProject } from "@/server/instant-premium/full-rerender-draft-service";

const draftAccessSelect = {
  id: true,
  projectType: true,
  stylePreset: true,
  instantOutputDurationSeconds: true,
  instantSelectedChips: true,
  instantUserIntent: true,
} as const;

export type DraftProjectAccess =
  | { ok: true }
  | { error: string; status: 404 | 409 };

export async function verifyInstantProjectDraftAccess(
  projectId: string,
  viewer: { id: string; role: string }
): Promise<DraftProjectAccess> {
  const row =
    viewer.role === "admin"
      ? await prisma.animationProject.findUnique({
          where: { id: projectId },
          select: draftAccessSelect,
        })
      : await prisma.animationProject.findFirst({
          where: { id: projectId, ownerId: viewer.id },
          select: draftAccessSelect,
        });

  if (!row) {
    return { error: "Project not found.", status: 404 };
  }
  if (!isInstantLikeProject(row)) {
    return {
      error: "Full rerender is only available for instant premium projects.",
      status: 409,
    };
  }
  return { ok: true };
}

/** Minimal project load for POST ensure — avoids renderVersions / languageExports includes. */
export async function getInstantProjectForDraftEnsure(
  projectId: string,
  viewer: { id: string; role: string }
): Promise<FullRerenderDraftProject | null> {
  const row =
    viewer.role === "admin"
      ? await prisma.animationProject.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            instantSceneTexts: true,
            instantUserIntent: true,
            instantTransitionSeconds: true,
            instantMode: true,
            projectType: true,
            stylePreset: true,
            instantOutputDurationSeconds: true,
            instantSelectedChips: true,
            images: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                previewUrl: true,
                viduInputUrl: true,
                fileName: true,
              },
            },
          },
        })
      : await prisma.animationProject.findFirst({
          where: { id: projectId, ownerId: viewer.id },
          select: {
            id: true,
            instantSceneTexts: true,
            instantUserIntent: true,
            instantTransitionSeconds: true,
            instantMode: true,
            projectType: true,
            stylePreset: true,
            instantOutputDurationSeconds: true,
            instantSelectedChips: true,
            images: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                previewUrl: true,
                viduInputUrl: true,
                fileName: true,
              },
            },
          },
        });

  if (!row || !isInstantLikeProject(row)) {
    return null;
  }

  return {
    id: row.id,
    instantSceneTexts: row.instantSceneTexts,
    instantUserIntent: row.instantUserIntent,
    instantTransitionSeconds: row.instantTransitionSeconds,
    instantMode: row.instantMode,
    images: row.images,
  };
}
