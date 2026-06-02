/**
 * Project video version catalog — current vs archived, per language and text rerenders.
 */

import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

export type VideoVersionKind = "original" | "clean" | "text_rerender" | "language";

export type VideoVersionLifecycle = "current" | "archived" | "pending" | "failed";

export type LanguageExportVersionRow = VideoLanguageExportSummary & {
  version: number;
  isDefault: boolean;
};

export type ProjectVideoVersionItem = {
  id: string;
  kind: VideoVersionKind;
  languageCode?: string;
  languageLabel?: string;
  versionNumber: number;
  lifecycle: VideoVersionLifecycle;
  status: string;
  outputVideoUrl: string | null;
  createdAt: string | null;
  completedAt: string | null;
  languageExportId?: string;
  textRerenderGeneration?: number;
  downloadHref: string;
  filename: string;
  labelKey?: string;
  label?: string;
  section: "primary" | "history";
};

export type ProjectVideoVersionCatalog = {
  primary: ProjectVideoVersionItem[];
  history: ProjectVideoVersionItem[];
  all: ProjectVideoVersionItem[];
};

export type BuildVersionCatalogInput = {
  projectId: string;
  originalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  languageExports: LanguageExportVersionRow[];
  previousFinalVideoUrl?: string | null;
  rebuildCount?: number;
  rebuiltAt?: string | null;
};

function isCompleted(row: Pick<LanguageExportVersionRow, "status" | "outputVideoUrl">): boolean {
  return row.status === "completed" && Boolean(row.outputVideoUrl?.trim());
}

function sortByVersionDesc<T extends { version: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.version - a.version);
}

/** Current completed export per language — prefers isDefault, else highest version. */
export function pickCurrentLanguageExportPerLanguage(
  exports: LanguageExportVersionRow[]
): LanguageExportVersionRow[] {
  const byCode = new Map<string, LanguageExportVersionRow[]>();
  for (const row of exports) {
    if (!isCompleted(row)) {
      continue;
    }
    const list = byCode.get(row.languageCode) ?? [];
    list.push(row);
    byCode.set(row.languageCode, list);
  }

  const current: LanguageExportVersionRow[] = [];
  for (const rows of byCode.values()) {
    const sorted = sortByVersionDesc(rows);
    const flagged = sorted.find((row) => row.isDefault);
    current.push(flagged ?? sorted[0]!);
  }
  return current.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
}

export function resolveLanguageVersionLifecycle(
  row: LanguageExportVersionRow,
  current: LanguageExportVersionRow | undefined
): VideoVersionLifecycle {
  if (row.status === "failed" || row.status === "needs_refresh") {
    return "failed";
  }
  if (row.status === "queued" || row.status === "rendering" || row.status === "draft") {
    return "pending";
  }
  if (isCompleted(row) && current?.id === row.id) {
    return "current";
  }
  if (isCompleted(row)) {
    return "archived";
  }
  return "pending";
}

export function formatLanguageVersionLabel(
  languageLabel: string,
  version: number,
  locale: "en" | "nl" = "nl"
): string {
  const suffix = locale === "nl" ? "v" : "v";
  return `${languageLabel} ${suffix}${version}`;
}

function languageDownloadHref(projectId: string, row: LanguageExportVersionRow): string {
  return animationProjectDownloadUrl(projectId, {
    languageCode: row.languageCode,
    languageExportId: row.id,
  });
}

function buildLanguageItems(
  projectId: string,
  exports: LanguageExportVersionRow[]
): { primary: ProjectVideoVersionItem[]; history: ProjectVideoVersionItem[] } {
  const primary: ProjectVideoVersionItem[] = [];
  const history: ProjectVideoVersionItem[] = [];
  const byCode = new Map<string, LanguageExportVersionRow[]>();

  for (const row of exports) {
    if (row.languageCode === "original") {
      continue;
    }
    const list = byCode.get(row.languageCode) ?? [];
    list.push(row);
    byCode.set(row.languageCode, list);
  }

  for (const [languageCode, rows] of byCode) {
    const sorted = sortByVersionDesc(rows);
    const current = pickCurrentLanguageExportPerLanguage(rows)[0];

    for (const row of sorted) {
      const lifecycle = resolveLanguageVersionLifecycle(row, current);
      const item: ProjectVideoVersionItem = {
        id: `lang-${row.id}`,
        kind: "language",
        languageCode,
        languageLabel: row.languageLabel,
        versionNumber: row.version,
        lifecycle,
        status: row.status,
        outputVideoUrl: row.outputVideoUrl?.trim() ?? null,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
        languageExportId: row.id,
        downloadHref: languageDownloadHref(projectId, row),
        filename: `homecheff-motion-${projectId}-${languageCode}-v${row.version}.mp4`,
        label: formatLanguageVersionLabel(row.languageLabel, row.version),
        section: lifecycle === "archived" ? "history" : "primary",
      };

      if (lifecycle === "archived") {
        history.push(item);
      } else {
        primary.push(item);
      }
    }
  }

  return { primary, history };
}

function buildTextRerenderItems(input: BuildVersionCatalogInput): {
  primary: ProjectVideoVersionItem[];
  history: ProjectVideoVersionItem[];
} {
  const history: ProjectVideoVersionItem[] = [];
  const rebuildCount = Math.max(0, input.rebuildCount ?? 0);
  const previousUrl = input.previousFinalVideoUrl?.trim() ?? null;

  if (previousUrl && rebuildCount > 0) {
    history.push({
      id: "text-archived-previous",
      kind: "text_rerender",
      versionNumber: Math.max(1, rebuildCount - 1),
      lifecycle: "archived",
      status: "completed",
      outputVideoUrl: previousUrl,
      createdAt: null,
      completedAt: input.rebuiltAt ?? null,
      textRerenderGeneration: rebuildCount - 1,
      downloadHref: animationProjectDownloadUrl(input.projectId, { variant: "previous_final" }),
      filename: `homecheff-motion-${input.projectId}-text-v${Math.max(1, rebuildCount - 1)}.mp4`,
      labelKey: "projectDetail.versions.textArchivedLabel",
      section: "history",
    });
  }

  return { primary: [], history };
}

export function buildProjectVideoVersionCatalog(
  input: BuildVersionCatalogInput
): ProjectVideoVersionCatalog {
  const primary: ProjectVideoVersionItem[] = [];
  const history: ProjectVideoVersionItem[] = [];

  if (input.originalVideoUrl?.trim()) {
    primary.push({
      id: "original",
      kind: "original",
      languageCode: "original",
      versionNumber: 1,
      lifecycle: "current",
      status: "completed",
      outputVideoUrl: input.originalVideoUrl.trim(),
      createdAt: null,
      completedAt: null,
      downloadHref: animationProjectDownloadUrl(input.projectId),
      filename: `homecheff-motion-${input.projectId}.mp4`,
      labelKey: "projectDetail.downloadPicker.originalLabel",
      section: "primary",
    });
  }

  if (input.cleanVideoUrl?.trim()) {
    primary.push({
      id: "clean",
      kind: "clean",
      versionNumber: 1,
      lifecycle: "current",
      status: "completed",
      outputVideoUrl: input.cleanVideoUrl.trim(),
      createdAt: null,
      completedAt: null,
      downloadHref: animationProjectDownloadUrl(input.projectId, { variant: "clean" }),
      filename: `homecheff-motion-${input.projectId}-clean.mp4`,
      labelKey: "projectDetail.downloadPicker.cleanLabel",
      section: "primary",
    });
  }

  const textItems = buildTextRerenderItems(input);
  history.push(...textItems.history);

  const languageItems = buildLanguageItems(input.projectId, input.languageExports);
  primary.push(...languageItems.primary);
  history.push(...languageItems.history);

  const all = [...primary, ...history];
  return { primary, history, all };
}

export function pickDownloadableVersionItems(
  catalog: ProjectVideoVersionCatalog
): ProjectVideoVersionItem[] {
  return catalog.all.filter(
    (item) => item.lifecycle === "current" || item.lifecycle === "archived"
  ).filter((item) => Boolean(item.outputVideoUrl?.trim()));
}

export function shouldOpenVersionDownloadPicker(catalog: ProjectVideoVersionCatalog): boolean {
  return pickDownloadableVersionItems(catalog).length > 1;
}

export function normalizeLanguageExportRows(
  exports: Array<
    Pick<
      VideoLanguageExportSummary,
      "id" | "languageCode" | "languageLabel" | "status" | "outputVideoUrl"
    > &
      Partial<
        Pick<
          VideoLanguageExportSummary,
          | "sourceFinalVideoUrl"
          | "textLayerJson"
          | "translationProvider"
          | "errorMessage"
          | "createdAt"
          | "completedAt"
          | "version"
          | "isDefault"
        >
      >
  >
): LanguageExportVersionRow[] {
  return exports.map((row, index) => ({
    id: row.id,
    languageCode: row.languageCode,
    languageLabel: row.languageLabel,
    status: row.status,
    outputVideoUrl: row.outputVideoUrl,
    sourceFinalVideoUrl: row.sourceFinalVideoUrl ?? "",
    textLayerJson: row.textLayerJson ?? null,
    translationProvider: row.translationProvider ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt ?? "",
    completedAt: row.completedAt ?? null,
    version: typeof row.version === "number" ? row.version : index + 1,
    isDefault: typeof row.isDefault === "boolean" ? row.isDefault : false,
  }));
}
