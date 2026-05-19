import type { AnimationExport, AnimationProject, AnimationTransition } from "@prisma/client";

type ProjectWithMedia = AnimationProject & {
  transitions: AnimationTransition[];
  exports: AnimationExport[];
};

export type ResolvedVideoDownload = {
  sourceUrl: string;
  filename: string;
};

/**
 * Resolves a downloadable video for a project the viewer owns (or admin).
 * Without `segmentOrder`, returns the latest export with an output URL.
 * With `segmentOrder`, returns that transition's clip.
 */
export function resolveProjectVideoDownload(
  project: ProjectWithMedia,
  segmentOrder?: number
): ResolvedVideoDownload | null {
  if (segmentOrder !== undefined) {
    if (!Number.isInteger(segmentOrder) || segmentOrder < 0) {
      return null;
    }
    const transition = project.transitions.find((t) => t.order === segmentOrder);
    const sourceUrl = transition?.outputVideoUrl?.trim();
    if (!sourceUrl) {
      return null;
    }
    return {
      sourceUrl,
      filename: `homecheff-motion-${project.id}-segment-${segmentOrder + 1}.mp4`,
    };
  }

  const exportWithUrl = project.exports.find((e) => e.outputVideoUrl?.trim());
  const sourceUrl = exportWithUrl?.outputVideoUrl?.trim();
  if (!sourceUrl) {
    return null;
  }

  return {
    sourceUrl,
    filename: `homecheff-motion-${project.id}.mp4`,
  };
}
