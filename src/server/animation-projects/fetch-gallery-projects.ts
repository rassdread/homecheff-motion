import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  galleryListProjectSelectLegacy,
  galleryListProjectSelectWithRebuild,
} from "@/server/animation-projects/gallery-list-select";
import { isPrismaMissingColumnError } from "@/server/animation-projects/prisma-schema-compat";
import type { GalleryListPrismaRow } from "@/server/animation-projects/gallery-list";

export type FetchGalleryProjectsParams = {
  where: Prisma.AnimationProjectWhereInput;
  take: number;
  skip: number;
  listAll: boolean;
};

export async function fetchGalleryProjectRows(
  params: FetchGalleryProjectsParams
): Promise<GalleryListPrismaRow[]> {
  const selectWithOwner = params.listAll
    ? ({
        ...galleryListProjectSelectWithRebuild,
        owner: { select: { email: true } },
      } as const)
    : galleryListProjectSelectWithRebuild;

  try {
    const rows = await prisma.animationProject.findMany({
      where: params.where,
      orderBy: { createdAt: "desc" },
      take: params.take,
      skip: params.skip,
      select: selectWithOwner as Prisma.AnimationProjectSelect,
    });
    return rows as unknown as GalleryListPrismaRow[];
  } catch (error) {
    if (!isPrismaMissingColumnError(error)) {
      throw error;
    }
    console.warn("[gallery-list]", {
      phase: "fallbackLegacySelect",
      reason: "missing_rebuild_columns",
      message: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
    const legacySelect = params.listAll
      ? ({
          ...galleryListProjectSelectLegacy,
          owner: { select: { email: true } },
        } as const)
      : galleryListProjectSelectLegacy;
    const rows = await prisma.animationProject.findMany({
      where: params.where,
      orderBy: { createdAt: "desc" },
      take: params.take,
      skip: params.skip,
      select: legacySelect as Prisma.AnimationProjectSelect,
    });
    return rows as unknown as GalleryListPrismaRow[];
  }
}
