import type { Prisma } from "@prisma/client";

/**
 * Completed gallery (My Videos / Afgeronde video's) must keep projects visible during
 * full rerender: export.outputVideoUrl is cleared while instantPreviousFinalVideoUrl
 * retains the last playable final.
 */
export function buildCompletedGalleryWhere(
  scope: Prisma.AnimationProjectWhereInput
): Prisma.AnimationProjectWhereInput {
  return {
    ...scope,
    OR: [
      { exports: { some: { outputVideoUrl: { not: null } } } },
      { instantPreviousFinalVideoUrl: { not: null } },
    ],
  };
}

export function projectMatchesCompletedGalleryFilter(project: {
  exports: Array<{ outputVideoUrl: string | null }>;
  instantPreviousFinalVideoUrl: string | null;
}): boolean {
  if (project.instantPreviousFinalVideoUrl?.trim()) {
    return true;
  }
  return project.exports.some((e) => Boolean(e.outputVideoUrl?.trim()));
}
