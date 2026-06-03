/**
 * Downloadable video version options — built from version catalog.
 */

import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import type { ProjectVideoVersionItem } from "@/lib/project-video-versions";
import {
  buildProjectVideoVersionCatalog,
  normalizeLanguageExportRows,
} from "@/lib/project-video-versions";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

export type VideoDownloadOptionKind =
  | "original"
  | "clean"
  | "language"
  | "text_rerender"
  | "full_rerender";

export type VideoDownloadOption = {
  id: string;
  kind: VideoDownloadOptionKind;
  languageCode?: string;
  labelKey?: string;
  label?: string;
  descriptionKey: string;
  badgeKey?: string;
  lifecycleBadgeKey?: string;
  href: string;
  filename: string;
  downloadable: boolean;
  status?: string;
  versionNumber?: number;
  lifecycle?: ProjectVideoVersionItem["lifecycle"];
  section: "primary" | "history";
  createdAt?: string | null;
  completedAt?: string | null;
  sizeBytes?: number | null;
  languageExportId?: string;
};

const DESCRIPTION_BY_KIND: Record<VideoDownloadOptionKind, string> = {
  original: "projectDetail.downloadPicker.originalDescription",
  clean: "projectDetail.downloadPicker.cleanDescription",
  language: "projectDetail.downloadPicker.languageDescription",
  text_rerender: "projectDetail.downloadPicker.textRerenderDescription",
  full_rerender: "projectDetail.downloadPicker.fullRerenderDescription",
};

const BADGE_BY_KIND: Partial<Record<VideoDownloadOptionKind, string>> = {
  original: "projectDetail.downloadPicker.withTextBadge",
  clean: "projectDetail.downloadPicker.withoutTextBadge",
  language: "projectDetail.downloadPicker.languageBadge",
  text_rerender: "projectDetail.downloadPicker.withTextBadge",
};

function sizeForUrl(
  url: string | null | undefined,
  sizeByUrl?: Record<string, number | null | undefined>
): number | null {
  const trimmed = url?.trim();
  if (!trimmed || !sizeByUrl) {
    return null;
  }
  const size = sizeByUrl[trimmed];
  return size != null && Number.isFinite(size) ? size : null;
}

function lifecycleBadgeKey(lifecycle: ProjectVideoVersionItem["lifecycle"]): string | undefined {
  if (lifecycle === "current") {
    return "projectDetail.downloadPicker.currentBadge";
  }
  if (lifecycle === "archived") {
    return "projectDetail.downloadPicker.archivedBadge";
  }
  return undefined;
}

function mapItemToOption(
  item: ProjectVideoVersionItem,
  sizeByUrl?: Record<string, number | null | undefined>,
  includeNonDownloadable?: boolean
): VideoDownloadOption | null {
  const downloadable =
    (item.lifecycle === "current" || item.lifecycle === "archived") &&
    Boolean(item.outputVideoUrl?.trim());

  if (!downloadable && !includeNonDownloadable) {
    if (item.lifecycle === "pending" || item.lifecycle === "failed") {
      return null;
    }
  }

  if (!downloadable && item.lifecycle !== "pending" && item.lifecycle !== "failed") {
    return null;
  }

  return {
    id: item.id,
    kind: item.kind,
    languageCode: item.languageCode,
    labelKey: item.labelKey,
    label: item.label,
    descriptionKey: DESCRIPTION_BY_KIND[item.kind],
    badgeKey: BADGE_BY_KIND[item.kind],
    lifecycleBadgeKey: lifecycleBadgeKey(item.lifecycle),
    href: item.downloadHref,
    filename: item.filename,
    downloadable,
    status: item.status,
    versionNumber: item.versionNumber,
    lifecycle: item.lifecycle,
    section: item.section,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    sizeBytes: sizeForUrl(item.outputVideoUrl, sizeByUrl),
    languageExportId: item.languageExportId,
  };
}

export type BuildProjectDownloadOptionsInput = {
  projectId: string;
  originalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  languageExports: VideoLanguageExportSummary[];
  previousFinalVideoUrl?: string | null;
  rebuildCount?: number;
  rebuiltAt?: string | null;
  sizeByUrl?: Record<string, number | null | undefined>;
  includeNonDownloadable?: boolean;
};

export function buildProjectDownloadOptions(
  input: BuildProjectDownloadOptionsInput
): VideoDownloadOption[] {
  const catalog = buildProjectVideoVersionCatalog({
    projectId: input.projectId,
    originalVideoUrl: input.originalVideoUrl,
    cleanVideoUrl: input.cleanVideoUrl,
    languageExports: normalizeLanguageExportRows(input.languageExports),
    previousFinalVideoUrl: input.previousFinalVideoUrl,
    rebuildCount: input.rebuildCount,
    rebuiltAt: input.rebuiltAt,
  });
  const options: VideoDownloadOption[] = [];

  for (const item of catalog.all) {
    const option = mapItemToOption(item, input.sizeByUrl, input.includeNonDownloadable);
    if (option) {
      options.push(option);
    }
  }

  if (input.includeNonDownloadable) {
    for (const row of normalizeLanguageExportRows(input.languageExports)) {
      if (row.status === "draft") {
        continue;
      }
      if (options.some((opt) => opt.languageExportId === row.id)) {
        continue;
      }
      if (row.status === "completed" && row.outputVideoUrl?.trim()) {
        continue;
      }
      options.push({
        id: `lang-pending-${row.id}`,
        kind: "language",
        languageCode: row.languageCode,
        label: `${row.languageLabel} v${row.version}`,
        descriptionKey: DESCRIPTION_BY_KIND.language,
        badgeKey: BADGE_BY_KIND.language,
        href: animationProjectDownloadUrl(input.projectId, {
          languageCode: row.languageCode,
          languageExportId: row.id,
        }),
        filename: `homecheff-motion-${input.projectId}-${row.languageCode}-v${row.version}.mp4`,
        downloadable: false,
        status: row.status,
        versionNumber: row.version,
        lifecycle: row.status === "failed" ? "failed" : "pending",
        section: "primary",
        createdAt: row.createdAt,
        completedAt: row.completedAt,
        languageExportId: row.id,
      });
    }
  }

  return options;
}

export function pickDownloadableOptions(options: VideoDownloadOption[]): VideoDownloadOption[] {
  return options.filter((option) => option.downloadable);
}

export function shouldOpenDownloadPicker(options: VideoDownloadOption[]): boolean {
  return pickDownloadableOptions(options).length > 1;
}

export function resolveDirectDownloadOption(
  options: VideoDownloadOption[]
): VideoDownloadOption | null {
  const downloadable = pickDownloadableOptions(options);
  return downloadable.length === 1 ? downloadable[0] : null;
}

export function splitDownloadOptionsBySection(options: VideoDownloadOption[]): {
  primary: VideoDownloadOption[];
  history: VideoDownloadOption[];
} {
  return {
    primary: options.filter((option) => option.section === "primary"),
    history: options.filter((option) => option.section === "history"),
  };
}
