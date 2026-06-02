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
  variant?: string,
  languageExportId?: string
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
  const exportId = languageExportId?.trim();

  if (variant?.trim().toLowerCase() === "previous_final") {
    const previousUrl = project.instantPreviousFinalVideoUrl?.trim();
    if (!previousUrl) {
      return null;
    }
    return {
      sourceUrl: previousUrl,
      filename: `homecheff-motion-${project.id}-text-archived.mp4`,
    };
  }

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

  if (exportId) {
    const languageRow = (project.languageExports ?? []).find(
      (row) => row.id === exportId && row.status === "completed" && row.outputVideoUrl?.trim()
    );
    const languageUrl = languageRow?.outputVideoUrl?.trim();
    if (languageUrl && languageRow) {
      return {
        sourceUrl: languageUrl,
        filename: `homecheff-motion-${project.id}-${languageRow.languageCode}-v${languageRow.version}.mp4`,
      };
    }
    return null;
  }

  if (lang && lang !== "original" && isLanguageExportCode(lang)) {
    const languageRow = (project.languageExports ?? [])
      .filter((row) => row.languageCode === lang && row.status === "completed")
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return b.version - a.version;
      })[0];
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
