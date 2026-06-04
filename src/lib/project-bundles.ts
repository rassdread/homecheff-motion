/**
 * Group Motion projects into bundles by normalized title, owner, and type.
 */

import {
  buildMotionVersionCatalogForProject,
  findMotionVersionSlot,
  formatBundleLanguagesLabel,
  formatBundleLatestVersionLabel,
  mergeMotionVersionCatalogs,
  type MotionLanguageExportRow,
  type MotionRenderVersionRow,
  type MotionVersionCatalog,
} from "@/lib/motion-version-catalog";
import {
  resolveBundleDisplayName,
  resolveProjectBundleGroupKey,
  resolveProjectDisplayTitle,
} from "@/lib/project-display-title";
import type { AnimationProjectListItem } from "@/types/animation-api";

export type ProjectBundleMemberSummary = AnimationProjectListItem & {
  title: string | null;
  displayTitle: string;
};

export type ProjectBundleListItem = {
  bundleKey: string;
  displayTitle: string;
  bundleName: string | null;
  normalizedTitle: string;
  projectType: string;
  memberProjectIds: string[];
  members: ProjectBundleMemberSummary[];
  catalog: MotionVersionCatalog;
  languagesLabel: string;
  latestVersionLabel: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  status: string;
  sourceProjectId: string | null;
};

export type BuildBundleInput = ProjectBundleMemberSummary & {
  ownerId: string;
  bundleName?: string | null;
  bundleKey?: string | null;
  renderVersions?: MotionRenderVersionRow[];
  languageExports?: MotionLanguageExportRow[];
  instantCleanFinalVideoUrl?: string | null;
};

export function buildProjectBundleFromMembers(
  members: BuildBundleInput[],
  params: { ownerId: string; locale?: "en" | "nl" }
): ProjectBundleListItem | null {
  if (!members.length) {
    return null;
  }
  const locale = params.locale ?? "nl";
  const sorted = [...members].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const lead = sorted[0]!;
  const projectType = lead.projectType ?? "classic";
  const displayTitle = resolveBundleDisplayName(
    members.map((m) => ({ title: m.title ?? null, bundleName: m.bundleName ?? null })),
    locale
  );
  const bundleName = members.find((m) => m.bundleName?.trim())?.bundleName?.trim() ?? null;
  const groupLead = members.find((m) => m.bundleKey?.trim()) ?? lead;
  const bundleKey = resolveProjectBundleGroupKey({
    ownerId: params.ownerId,
    projectType,
    title: groupLead.title ?? null,
    bundleName: groupLead.bundleName ?? bundleName,
    bundleKey: groupLead.bundleKey,
  });
  const normalizedTitle = displayTitle.toLowerCase().replace(/\s+/g, " ");

  const catalogs = sorted.map((member) => ({
    memberCreatedAt: member.createdAt,
    catalog: buildMotionVersionCatalogForProject({
      projectId: member.id,
      title: member.title,
      exportOutputUrl: member.latestExport?.outputVideoUrl ?? null,
      exportStatus: member.latestExport?.status ?? null,
      projectStatus: member.status,
      projectCleanUrl: member.instantCleanFinalVideoUrl ?? null,
      thumbnailUrl: member.thumbnailUrl,
      thumbnailFallbackUrl: member.thumbnailFallbackUrl,
      durationSeconds: member.estimatedTotalDurationSeconds,
      renderVersions: member.renderVersions ?? [],
      languageExports: member.languageExports ?? [],
      locale,
    }),
  }));

  const catalog =
    catalogs.length === 1
      ? catalogs[0]!.catalog
      : mergeMotionVersionCatalogs(catalogs);

  const languagesLabel = formatBundleLanguagesLabel(catalog);
  const latestVersionLabel = formatBundleLatestVersionLabel(catalog, locale);

  const createdAt = sorted.reduce(
    (min, m) => (new Date(m.createdAt) < new Date(min) ? m.createdAt : min),
    sorted[0]!.createdAt
  );

  const defaultSlot = catalog.defaultSelectionKey
    ? findMotionVersionSlot(catalog, catalog.defaultSelectionKey)
    : null;
  const defaultThumb = defaultSlot
    ? defaultSlot.thumbnailUrl?.trim() || defaultSlot.thumbnailFallbackUrl?.trim() || null
    : null;

  return {
    bundleKey,
    displayTitle,
    bundleName,
    normalizedTitle,
    projectType,
    memberProjectIds: sorted.map((m) => m.id),
    members: sorted,
    catalog,
    languagesLabel,
    latestVersionLabel,
    createdAt,
    updatedAt: lead.updatedAt,
    thumbnailUrl:
      defaultThumb ??
      (lead.thumbnailUrl?.trim() || lead.thumbnailFallbackUrl?.trim() || null),
    status: defaultSlot?.status ?? lead.status,
    sourceProjectId: lead.sourceProjectId ?? null,
  };
}

export function groupProjectsIntoBundles(
  projects: BuildBundleInput[],
  params: { locale?: "en" | "nl" }
): ProjectBundleListItem[] {
  const groups = new Map<string, BuildBundleInput[]>();
  for (const project of projects) {
    const key = resolveProjectBundleGroupKey({
      ownerId: project.ownerId,
      projectType: project.projectType ?? "classic",
      title: project.title ?? null,
      bundleName: project.bundleName,
      bundleKey: project.bundleKey,
    });
    const list = groups.get(key) ?? [];
    list.push(project);
    groups.set(key, list);
  }

  const bundles: ProjectBundleListItem[] = [];
  for (const group of groups.values()) {
    const bundle = buildProjectBundleFromMembers(group, {
      ownerId: group[0]!.ownerId,
      locale: params.locale,
    });
    if (bundle) {
      bundles.push(bundle);
    }
  }

  return bundles.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function paginateBundles<T>(items: T[], page: number, limit: number): {
  items: T[];
  total: number;
  hasMore: boolean;
} {
  const safePage = page > 0 ? page : 1;
  const safeLimit = Math.max(1, limit);
  const offset = (safePage - 1) * safeLimit;
  const slice = items.slice(offset, offset + safeLimit);
  return {
    items: slice,
    total: items.length,
    hasMore: offset + slice.length < items.length,
  };
}
