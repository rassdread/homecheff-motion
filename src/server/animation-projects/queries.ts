import { prisma } from "@/lib/prisma";

const projectInclude = {
  images: {
    orderBy: { order: "asc" as const },
  },
  transitions: {
    orderBy: { order: "asc" as const },
  },
  exports: {
    orderBy: { createdAt: "desc" as const },
  },
} as const;

export async function getAnimationProjectById(id: string) {
  return prisma.animationProject.findUnique({
    where: { id },
    include: projectInclude,
  });
}

export async function getAnimationProjectByIdForOwner(id: string, ownerId: string) {
  return prisma.animationProject.findFirst({
    where: { id, ownerId },
    include: projectInclude,
  });
}

/** Owner always; admin may load any project by id (for gallery detail). */
export async function getAnimationProjectByIdForViewer(
  id: string,
  viewer: { id: string; role: string }
) {
  if (viewer.role === "admin") {
    return prisma.animationProject.findUnique({
      where: { id },
      include: {
        images: projectInclude.images,
        transitions: projectInclude.transitions,
        exports: projectInclude.exports,
        owner: { select: { email: true } },
      },
    });
  }
  return getAnimationProjectByIdForOwner(id, viewer.id);
}

