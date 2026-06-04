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
      {
        renderVersions: {
          some: {
            status: "completed",
            finalVideoUrl: { not: null },
          },
        },
      },
    ],
  };
}

export function projectMatchesCompletedGalleryFilter(project: {
  exports: Array<{ outputVideoUrl: string | null }>;
  instantPreviousFinalVideoUrl: string | null;
  renderVersions?: Array<{ status: string; finalVideoUrl: string | null }>;
}): boolean {
  if (project.instantPreviousFinalVideoUrl?.trim()) {
    return true;
  }
  if (
    project.renderVersions?.some(
      (v) => v.status === "completed" && Boolean(v.finalVideoUrl?.trim())
    )
  ) {
    return true;
  }
  return project.exports.some((e) => Boolean(e.outputVideoUrl?.trim()));
}
