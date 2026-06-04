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
  return `${params.ownerId}:${params.projectType}:${params.normalizedTitle}`;
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
  peers: Array<{ id: string; title: string | null; projectType: string | null }>;
  locale?: "en" | "nl";
}): BundleMembershipPreview {
  const locale = params.locale ?? "nl";
  const normalized = normalizeProjectBundleName(params.newTitle);
  const key = projectBundleGroupKey({
    ownerId: params.ownerId,
    projectType: params.projectType,
    normalizedTitle: normalized,
  });
  const members = params.peers.filter((peer) => {
    if (peer.id === params.projectId) {
      return false;
    }
    const peerType = peer.projectType ?? "classic";
    const peerKey = projectBundleGroupKey({
      ownerId: params.ownerId,
      projectType: peerType,
      normalizedTitle: normalizeProjectBundleName(peer.title),
    });
    return peerKey === key;
  });
  return {
    willJoinExisting: members.length > 0,
    bundleDisplayTitle: resolveProjectDisplayTitle(params.newTitle, locale),
    existingVersionCount: members.length,
    memberProjectIds: members.map((m) => m.id),
  };
}
