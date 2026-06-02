import { isLanguageExportCode } from "@/lib/video-language-export";
import { rawExportUrlForDownload } from "@/server/instant-premium/playback-debug";
import type { AnimationProjectWithMedia } from "@/server/animation-projects/queries";

export type ProjectWithMedia = AnimationProjectWithMedia;

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
  segmentOrder?: number,
  languageCode?: string,
  variant?: string
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

  const lang = languageCode?.trim().toLowerCase();
  if (variant?.trim().toLowerCase() === "clean") {
    const cleanUrl = project.instantCleanFinalVideoUrl?.trim();
    if (!cleanUrl) {
      return null;
    }
    return {
      sourceUrl: cleanUrl,
      filename: `homecheff-motion-${project.id}-clean.mp4`,
    };
  }

  if (lang && lang !== "original" && isLanguageExportCode(lang)) {
    const languageRow = (project.languageExports ?? [])
      .filter((row) => row.languageCode === lang && row.status === "completed")
      .sort((a, b) => b.version - a.version)[0];
    const languageUrl = languageRow?.outputVideoUrl?.trim();
    if (languageUrl) {
      return {
        sourceUrl: languageUrl,
        filename: `homecheff-motion-${project.id}-${lang}.mp4`,
      };
    }
    return null;
  }

  const exportWithUrl = project.exports.find((e) => e.outputVideoUrl?.trim());
  const sourceUrl = rawExportUrlForDownload(project, exportWithUrl);
  if (!sourceUrl) {
    return null;
  }

  return {
    sourceUrl,
    filename: `homecheff-motion-${project.id}.mp4`,
  };
}
