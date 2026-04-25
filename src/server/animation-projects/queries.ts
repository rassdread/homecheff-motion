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
