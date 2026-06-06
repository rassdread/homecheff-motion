/**
 * Human-readable generation chain for video detail (no technical IDs).
 */

import type { AnimationProjectDetailResponse } from "@/types/animation-api";

export type RenderGenerationTraceStep = {
  id: string;
  labelKey: string;
  params?: Record<string, string | number>;
  isCurrent?: boolean;
};

export function buildRenderGenerationTrace(
  detail: AnimationProjectDetailResponse,
  options?: { renderVersionId?: string | null; languageExportId?: string | null }
): RenderGenerationTraceStep[] {
  const steps: RenderGenerationTraceStep[] = [];

  if (detail.studioSource?.storyboardId) {
    const title = detail.studioSource.storyboardTitle?.trim() || detail.title?.trim() || "";
    steps.push({
      id: "studio",
      labelKey: title ? "studio.renderTrace.studioNamed" : "studio.renderTrace.studio",
      params: title ? { title } : undefined,
    });
  }

  steps.push({
    id: "motion",
    labelKey: "studio.renderTrace.motion",
  });

  const versions = [...(detail.renderVersions ?? [])].sort(
    (a, b) => a.renderVersionNumber - b.renderVersionNumber
  );
  const textVersions = versions.filter((v) => v.kind === "text_rerender");
  const fullVersions = versions.filter((v) => v.kind === "full_rerender");

  if (textVersions.length > 0) {
    const latestText = textVersions[textVersions.length - 1]!;
    steps.push({
      id: "text_edits",
      labelKey: "studio.renderTrace.textEdits",
      params: { count: textVersions.length },
      isCurrent:
        options?.renderVersionId === latestText.id ||
        (!options?.languageExportId && latestText.isDefault),
    });
  }

  if (fullVersions.length > 0 && textVersions.length === 0) {
    steps.push({
      id: "full_rerender",
      labelKey: "studio.renderTrace.fullRerender",
      params: { count: fullVersions.length },
    });
  }

  const languageExports = (detail.languageExports ?? []).filter(
    (e) => e.languageCode !== "original"
  );
  if (languageExports.length > 0) {
    const activeExport =
      options?.languageExportId
        ? languageExports.find((e) => e.id === options.languageExportId)
        : undefined;
    steps.push({
      id: "languages",
      labelKey: "studio.renderTrace.languages",
      params: { count: languageExports.length },
      isCurrent: Boolean(activeExport),
    });
    if (activeExport) {
      steps.push({
        id: "current_language",
        labelKey: "studio.renderTrace.currentLanguage",
        params: { language: activeExport.languageLabel },
        isCurrent: true,
      });
    }
  }

  const currentVersion =
    options?.renderVersionId
      ? versions.find((v) => v.id === options.renderVersionId)
      : versions.find((v) => v.isDefault) ?? versions[versions.length - 1];

  if (currentVersion && !steps.some((s) => s.isCurrent)) {
    const note = currentVersion.versionNote?.trim() ?? "";
    steps.push({
      id: "current",
      labelKey: note ? "studio.renderTrace.currentVersionNoted" : "studio.renderTrace.currentVersion",
      params: {
        version: currentVersion.renderVersionNumber,
        ...(note ? { note } : {}),
      },
      isCurrent: true,
    });
  } else if (!steps.some((s) => s.isCurrent)) {
    steps.push({
      id: "current",
      labelKey: "studio.renderTrace.currentPlayback",
      isCurrent: true,
    });
  }

  return steps;
}
