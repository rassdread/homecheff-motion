/**
 * Motion V22.4 — UI-only folder grouping for project bundles (no schema).
 */

export const BUNDLE_FOLDER_IDS = [
  "all",
  "garden",
  "chef",
  "designer",
  "affiliate",
  "growth",
  "homecheff",
  "tests",
  "archive",
  "uncategorized",
] as const;

export type BundleFolderId = (typeof BUNDLE_FOLDER_IDS)[number];

export type BundleFolderMeta = {
  id: BundleFolderId;
  labelKey: string;
};

export const BUNDLE_FOLDER_OPTIONS: BundleFolderMeta[] = [
  { id: "all", labelKey: "videos.folder.all" },
  { id: "garden", labelKey: "videos.folder.garden" },
  { id: "chef", labelKey: "videos.folder.chef" },
  { id: "designer", labelKey: "videos.folder.designer" },
  { id: "affiliate", labelKey: "videos.folder.affiliate" },
  { id: "growth", labelKey: "videos.folder.growth" },
  { id: "homecheff", labelKey: "videos.folder.homecheff" },
  { id: "tests", labelKey: "videos.folder.tests" },
  { id: "archive", labelKey: "videos.folder.archive" },
  { id: "uncategorized", labelKey: "videos.folder.uncategorized" },
];

export function resolveBundleFolderId(input: {
  bundleName?: string | null;
  displayTitle?: string | null;
  normalizedTitle?: string | null;
}): BundleFolderId {
  const corpus = `${input.bundleName ?? ""} ${input.displayTitle ?? ""} ${input.normalizedTitle ?? ""}`
    .trim()
    .toLowerCase();
  if (!corpus) {
    return "uncategorized";
  }
  if (/\b(test|tests|experiment|prototype|sandbox|poc)\b/.test(corpus)) {
    return "tests";
  }
  if (/\b(archive|archief|archived|oud)\b/.test(corpus)) {
    return "archive";
  }
  if (/\b(garden|tuin|plant|herb)\b/.test(corpus)) {
    return "garden";
  }
  if (/\b(chef|kok|cook|keuken)\b/.test(corpus)) {
    return "chef";
  }
  if (/\b(design|designer|creative|studio|ontwerp)\b/.test(corpus)) {
    return "designer";
  }
  if (/\b(affiliate|seller|deal|product)\b/.test(corpus)) {
    return "affiliate";
  }
  if (/\b(growth|marketing|ads|campaign)\b/.test(corpus)) {
    return "growth";
  }
  if (/\b(homecheff|home cheff)\b/.test(corpus)) {
    return "homecheff";
  }
  return "uncategorized";
}

export function bundleMatchesFolder(
  folderFilter: BundleFolderId,
  bundleFolderId: BundleFolderId
): boolean {
  if (folderFilter === "all") {
    return true;
  }
  return folderFilter === bundleFolderId;
}
