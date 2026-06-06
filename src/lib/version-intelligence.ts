/**
 * Human-readable version change summaries.
 */

import type {
  AnimationProjectDetailResponse,
  ProjectRenderVersionSummary,
  VideoLanguageExportSummary,
} from "@/types/animation-api";

export type VersionChangeLine = {
  messageKey: string;
  params?: Record<string, string | number>;
};

export type VersionIntelligenceSummary = {
  versionId: string;
  title: string;
  kind: string;
  lines: VersionChangeLine[];
};

function renderVersionLines(version: ProjectRenderVersionSummary): VersionChangeLine[] {
  const lines: VersionChangeLine[] = [];
  if (version.kind === "text_rerender") {
    lines.push({ messageKey: "studio.aiAssistant.version.textEdit" });
    if (version.versionNote?.trim()) {
      lines.push({
        messageKey: "studio.aiAssistant.version.note",
        params: { note: version.versionNote.trim() },
      });
    }
  } else if (version.kind === "full_rerender") {
    lines.push({ messageKey: "studio.aiAssistant.version.fullRerender" });
    if (version.versionNote?.trim()) {
      lines.push({
        messageKey: "studio.aiAssistant.version.motionNote",
        params: { note: version.versionNote.trim() },
      });
    }
  } else if (version.kind === "initial") {
    lines.push({ messageKey: "studio.aiAssistant.version.original" });
  }
  return lines;
}

function languageExportLines(exportRow: VideoLanguageExportSummary): VersionChangeLine[] {
  const lang = exportRow.languageCode?.toUpperCase() ?? exportRow.languageCode ?? "?";
  return [
    {
      messageKey: "studio.aiAssistant.version.language",
      params: { language: lang },
    },
  ];
}

export function buildVersionIntelligenceSummaries(
  detail: AnimationProjectDetailResponse
): VersionIntelligenceSummary[] {
  const summaries: VersionIntelligenceSummary[] = [];

  for (const version of detail.renderVersions ?? []) {
    summaries.push({
      versionId: version.id,
      title: `V${version.renderVersionNumber}${version.versionNote ? ` — ${version.versionNote}` : ""}`,
      kind: version.kind,
      lines: renderVersionLines(version),
    });
  }

  for (const langExport of detail.languageExports ?? []) {
    summaries.push({
      versionId: langExport.id,
      title: langExport.languageCode?.toUpperCase() ?? langExport.id,
      kind: "language_export",
      lines: languageExportLines(langExport),
    });
  }

  return summaries;
}
