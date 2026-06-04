import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const animationProjectWithMediaInclude = {
  sourceProject: {
    select: { id: true, title: true },
  },
  images: {
    orderBy: { order: "asc" as const },
  },
  transitions: {
    orderBy: { order: "asc" as const },
  },
  exports: {
    orderBy: { createdAt: "desc" as const },
  },
  languageExports: {
    orderBy: [{ languageCode: "asc" as const }, { version: "desc" as const }],
  },
  renderVersions: {
    orderBy: { renderVersionNumber: "desc" as const },
  },
};

export type AnimationProjectWithMedia = Prisma.AnimationProjectGetPayload<{
  include: typeof animationProjectWithMediaInclude;
}>;

export async function getAnimationProjectById(id: string): Promise<AnimationProjectWithMedia | null> {
  return prisma.animationProject.findUnique({
    where: { id },
    include: animationProjectWithMediaInclude,
  });
}

export async function getAnimationProjectByIdForOwner(
  id: string,
  ownerId: string
): Promise<AnimationProjectWithMedia | null> {
  return prisma.animationProject.findFirst({
    where: { id, ownerId },
    include: animationProjectWithMediaInclude,
  });
}

export type AnimationProjectForViewer = AnimationProjectWithMedia & {
  owner?: { email: string };
};

/** Owner always; admin may load any project by id (for gallery detail). */
export async function getAnimationProjectByIdForViewer(
  id: string,
  viewer: { id: string; role: string }
): Promise<AnimationProjectForViewer | null> {
  if (viewer.role === "admin") {
    return prisma.animationProject.findUnique({
      where: { id },
      include: {
        ...animationProjectWithMediaInclude,
        owner: { select: { email: true } },
      },
    });
  }
  return getAnimationProjectByIdForOwner(id, viewer.id);
}

