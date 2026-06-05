import type { BundleVersionBadge, BundleVersionBadgeId } from "@/lib/bundle-version-badges";
import {
  summarizeBundleVersionCounts,
  type BundleVersionCountSummary,
} from "@/lib/bundle-version-summary";
import type { MotionVersionCatalog, MotionVersionSlot } from "@/lib/motion-version-catalog";
import type { BundleFolderId } from "@/lib/bundle-folder";
import { bundleMatchesFolder } from "@/lib/bundle-folder";

export type BundleCountPart = {
  key: string;
  label: string;
  count: number;
};

export type BundleRichSummary = BundleVersionCountSummary & {
  totalLanguages: number;
  sourceParts: BundleCountPart[];
  sourceLine: string;
  modeParts: BundleCountPart[];
  modeLine: string;
  featureParts: BundleCountPart[];
  featureLine: string;
  statusParts: BundleCountPart[];
  statusLine: string;
};

function formatCountLine(parts: BundleCountPart[]): string {
  return parts
    .filter((p) => p.count > 0)
    .map((p) => `${p.label} (${p.count})`)
    .join(" · ");
}

function iterateCatalogSlots(catalog: MotionVersionCatalog): MotionVersionSlot[] {
  const out: MotionVersionSlot[] = [];
  for (const lang of catalog.languages) {
    for (const slot of catalog.slotsByLanguage[lang.code] ?? []) {
      out.push(slot);
    }
  }
  return out;
}

function normalizeSlotStatus(status: string): "completed" | "failed" | "draft" {
  const s = status.toLowerCase();
  if (s === "completed") {
    return "completed";
  }
  if (s === "failed") {
    return "failed";
  }
  return "draft";
}

function badgeIdsForSlot(
  slot: MotionVersionSlot,
  badgesByProjectId?: Record<string, BundleVersionBadge[]>
): Set<BundleVersionBadgeId> {
  const badges = badgesByProjectId?.[slot.projectId] ?? [];
  const ids = new Set<BundleVersionBadgeId>(badges.map((b) => b.id));
  if (slot.kind === "language_export") {
    ids.add("text_only");
  }
  return ids;
}

function increment(map: Map<string, BundleCountPart>, key: string, label: string): void {
  const prev = map.get(key);
  if (prev) {
    prev.count += 1;
  } else {
    map.set(key, { key, label, count: 1 });
  }
}

export function summarizeBundleRichStats(params: {
  catalog: MotionVersionCatalog;
  badgesByProjectId?: Record<string, BundleVersionBadge[]>;
  locale?: "en" | "nl";
}): BundleRichSummary {
  const locale = params.locale ?? "nl";
  const base = summarizeBundleVersionCounts(params.catalog, locale);
  const slots = iterateCatalogSlots(params.catalog);

  const sourceMap = new Map<string, BundleCountPart>();
  const modeMap = new Map<string, BundleCountPart>();
  const featureMap = new Map<string, BundleCountPart>();
  const statusMap = new Map<string, BundleCountPart>();

  const motionLabel = locale === "en" ? "Motion" : "Motion";
  const studioLabel = locale === "en" ? "Studio" : "Studio";
  const uploadLabel = locale === "en" ? "Upload" : "Upload";
  const storyLabel = locale === "en" ? "Story Mode" : "Story Mode";
  const transitionLabel = locale === "en" ? "Transition Mode" : "Transition Mode";
  const voiceLabel = locale === "en" ? "Voice" : "Voice";
  const subsLabel = locale === "en" ? "Subtitles" : "Subtitles";
  const textLabel = locale === "en" ? "Text-only" : "Text-only";
  const completedLabel = locale === "en" ? "Completed" : "Voltooid";
  const failedLabel = locale === "en" ? "Failed" : "Mislukt";
  const draftLabel = locale === "en" ? "Draft" : "Concept";

  for (const slot of slots) {
    const ids = badgeIdsForSlot(slot, params.badgesByProjectId);
    if (ids.has("studio")) {
      increment(sourceMap, "studio", studioLabel);
    } else if (ids.has("motion")) {
      increment(sourceMap, "motion", motionLabel);
    } else {
      increment(sourceMap, "upload", uploadLabel);
    }

    if (ids.has("story_mode")) {
      increment(modeMap, "story", storyLabel);
    }
    if (ids.has("transition_mode")) {
      increment(modeMap, "transition", transitionLabel);
    }

    if (ids.has("voice")) {
      increment(featureMap, "voice", voiceLabel);
    }
    if (ids.has("subtitles")) {
      increment(featureMap, "subtitles", subsLabel);
    }
    if (ids.has("text_only")) {
      increment(featureMap, "text_only", textLabel);
    }

    const statusKey = normalizeSlotStatus(slot.status);
    if (statusKey === "completed") {
      increment(statusMap, "completed", completedLabel);
    } else if (statusKey === "failed") {
      increment(statusMap, "failed", failedLabel);
    } else {
      increment(statusMap, "draft", draftLabel);
    }
  }

  const sourceParts = [...sourceMap.values()];
  const modeParts = [...modeMap.values()];
  const featureParts = [...featureMap.values()];
  const statusParts = [...statusMap.values()];

  return {
    ...base,
    totalLanguages: base.languageParts.length,
    sourceParts,
    sourceLine: formatCountLine(sourceParts),
    modeParts,
    modeLine: formatCountLine(modeParts),
    featureParts,
    featureLine: formatCountLine(featureParts),
    statusParts,
    statusLine: formatCountLine(statusParts),
  };
}

export function formatSelectedVersionLabel(params: {
  languageLabel: string;
  versionLabel: string;
  locale?: "en" | "nl";
}): string {
  const lang = params.languageLabel.trim() || (params.locale === "en" ? "Default" : "Standaard");
  const ver = params.versionLabel.trim() || (params.locale === "en" ? "V1" : "V1");
  if (ver.toUpperCase().startsWith(lang.toUpperCase())) {
    return ver;
  }
  return `${lang} ${ver}`;
}

export function formatLatestVersionLabel(
  rich: Pick<BundleRichSummary, "latestLabel">,
  locale: "en" | "nl" = "nl"
): string | null {
  if (!rich.latestLabel) {
    return null;
  }
  return locale === "en" ? `Latest: ${rich.latestLabel}` : `Laatste: ${rich.latestLabel}`;
}

export function formatSelectedVersionSummaryLabel(
  languageLabel: string,
  versionLabel: string,
  locale: "en" | "nl" = "nl"
): string {
  const inner = formatSelectedVersionLabel({ languageLabel, versionLabel, locale });
  return locale === "en" ? `Selected: ${inner}` : `Geselecteerd: ${inner}`;
}

export type FolderBundleCounts = Record<BundleFolderId, number>;

/** Count visible bundles per folder chip (client-side over loaded bundles). */
export function countBundlesPerFolder(
  bundles: Array<{ folderId?: string | null }>
): FolderBundleCounts {
  const counts = {} as FolderBundleCounts;
  for (const bundle of bundles) {
    const fid = (bundle.folderId ?? "uncategorized") as BundleFolderId;
    counts[fid] = (counts[fid] ?? 0) + 1;
  }
  counts.all = bundles.length;
  return counts;
}

export type FolderLibrarySummary = {
  videoCount: number;
  totalVersions: number;
  languageLine: string;
  sourceLine: string;
};

export function summarizeFolderLibraryView(
  bundles: Array<{
    folderId?: string | null;
    catalog: MotionVersionCatalog;
    badgesByProjectId?: Record<string, BundleVersionBadge[]>;
  }>,
  folderId: BundleFolderId,
  locale: "en" | "nl" = "nl"
): FolderLibrarySummary | null {
  const filtered =
    folderId === "all"
      ? bundles
      : bundles.filter((b) =>
          bundleMatchesFolder(folderId, (b.folderId as BundleFolderId) ?? "uncategorized")
        );
  if (folderId !== "all" && filtered.length === 0) {
    return null;
  }
  const languageTotals = new Map<string, number>();
  let totalVersions = 0;
  const sourceTotals = new Map<string, BundleCountPart>();

  for (const bundle of filtered) {
    const rich = summarizeBundleRichStats({
      catalog: bundle.catalog,
      badgesByProjectId: bundle.badgesByProjectId,
      locale,
    });
    totalVersions += rich.totalVersions;
    for (const part of rich.languageParts) {
      languageTotals.set(part.label, (languageTotals.get(part.label) ?? 0) + part.count);
    }
    for (const part of rich.sourceParts) {
      const prev = sourceTotals.get(part.key);
      if (prev) {
        prev.count += part.count;
      } else {
        sourceTotals.set(part.key, { ...part });
      }
    }
  }

  const languageLine = [...languageTotals.entries()]
    .map(([label, count]) => `${label} (${count})`)
    .join(" · ");

  const sourceLine = formatCountLine([...sourceTotals.values()]);

  return {
    videoCount: filtered.length,
    totalVersions,
    languageLine,
    sourceLine,
  };
}
