/**
 * Project display title and bundle name normalization.
 */

export const UNTITLED_PROJECT_TITLE_EN = "Untitled video";
export const UNTITLED_PROJECT_TITLE_NL = "Naamloze video";

const MAX_PROJECT_TITLE_LENGTH = 120;

export function normalizeProjectBundleName(title: string | null | undefined): string {
  return (title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveProjectDisplayTitle(
  title: string | null | undefined,
  locale: "en" | "nl" = "nl"
): string {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed.slice(0, MAX_PROJECT_TITLE_LENGTH);
  }
  return locale === "en" ? UNTITLED_PROJECT_TITLE_EN : UNTITLED_PROJECT_TITLE_NL;
}

export function sanitizeProjectTitleInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_PROJECT_TITLE_LENGTH);
}

export function projectBundleGroupKey(params: {
  ownerId: string;
  projectType: string;
  normalizedTitle: string;
}): string {
  return `${params.ownerId}:${params.projectType}:title:${params.normalizedTitle}`;
}

export function sanitizeBundleKeyInput(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 80).toLowerCase().replace(/\s+/g, "-");
}

export function sanitizeBundleNameInput(value: string | null | undefined): string | null {
  return sanitizeProjectTitleInput(value);
}

/** Grouping priority: manual bundleKey → bundleName → normalized project title. */
export function resolveProjectBundleGroupKey(project: {
  ownerId: string;
  projectType: string;
  title: string | null;
  bundleKey?: string | null;
  bundleName?: string | null;
}): string {
  const projectType = project.projectType ?? "classic";
  const manualKey = sanitizeBundleKeyInput(project.bundleKey);
  if (manualKey) {
    return `${project.ownerId}:${projectType}:key:${manualKey}`;
  }
  const bundleNorm = normalizeProjectBundleName(project.bundleName);
  if (bundleNorm) {
    return `${project.ownerId}:${projectType}:bundle:${bundleNorm}`;
  }
  return projectBundleGroupKey({
    ownerId: project.ownerId,
    projectType,
    normalizedTitle: normalizeProjectBundleName(project.title),
  });
}

export function resolveBundleDisplayName(
  members: Array<{ title: string | null; bundleName: string | null }>,
  locale: "en" | "nl" = "nl"
): string {
  const named = members.find((m) => m.bundleName?.trim());
  if (named?.bundleName?.trim()) {
    return named.bundleName.trim();
  }
  const titled = members.find((m) => m.title?.trim());
  return resolveProjectDisplayTitle(titled?.title ?? null, locale);
}

export type BundleMembershipPreview = {
  willJoinExisting: boolean;
  bundleDisplayTitle: string;
  existingVersionCount: number;
  memberProjectIds: string[];
};

export function previewBundleMembershipAfterRename(params: {
  ownerId: string;
  projectType: string;
  projectId: string;
  newTitle: string | null;
  newBundleName?: string | null;
  newBundleKey?: string | null;
  peers: Array<{
    id: string;
    title: string | null;
    bundleName?: string | null;
    bundleKey?: string | null;
    projectType: string | null;
  }>;
  locale?: "en" | "nl";
}): BundleMembershipPreview {
  const locale = params.locale ?? "nl";
  const key = resolveProjectBundleGroupKey({
    ownerId: params.ownerId,
    projectType: params.projectType,
    title: params.newTitle,
    bundleName: params.newBundleName,
    bundleKey: params.newBundleKey,
  });
  const members = params.peers.filter((peer) => {
    if (peer.id === params.projectId) {
      return false;
    }
    const peerKey = resolveProjectBundleGroupKey({
      ownerId: params.ownerId,
      projectType: peer.projectType ?? "classic",
      title: peer.title,
      bundleName: peer.bundleName,
      bundleKey: peer.bundleKey,
    });
    return peerKey === key;
  });
  const displayTitle =
    params.newBundleName?.trim() ||
    resolveProjectDisplayTitle(params.newTitle, locale);
  return {
    willJoinExisting: members.length > 0,
    bundleDisplayTitle: displayTitle,
    existingVersionCount: members.length,
    memberProjectIds: members.map((m) => m.id),
  };
}
