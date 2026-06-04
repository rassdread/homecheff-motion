/**
 * Group Motion projects into bundles by normalized title, owner, and type.
 */

import {
  buildMotionVersionCatalogForProject,
  formatBundleLatestVersionLabel,
  mergeMotionVersionCatalogs,
  type MotionLanguageExportRow,
  type MotionRenderVersionRow,
  type MotionVersionCatalog,
} from "@/lib/motion-version-catalog";
import {
  normalizeProjectBundleName,
  projectBundleGroupKey,
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
  const displayTitle = resolveProjectDisplayTitle(
    members.find((m) => m.title?.trim())?.title ?? lead.title,
    locale
  );
  const normalizedTitle = normalizeProjectBundleName(
    members.find((m) => m.title?.trim())?.title ?? lead.title
  );
  const bundleKey = projectBundleGroupKey({
    ownerId: params.ownerId,
    projectType,
    normalizedTitle,
  });

  const catalogs = sorted.map((member) => ({
    memberCreatedAt: member.createdAt,
    catalog: buildMotionVersionCatalogForProject({
      projectId: member.id,
      title: member.title,
      exportOutputUrl: member.latestExport?.outputVideoUrl ?? null,
      exportStatus: member.latestExport?.status ?? null,
      projectStatus: member.status,
      projectCleanUrl: member.instantCleanFinalVideoUrl ?? null,
      renderVersions: member.renderVersions ?? [],
      languageExports: member.languageExports ?? [],
      locale,
    }),
  }));

  const catalog =
    catalogs.length === 1
      ? catalogs[0]!.catalog
      : mergeMotionVersionCatalogs(catalogs);

  const languagesLabel = catalog.languages.map((l) => l.label).join(" · ");
  const latestVersionLabel = formatBundleLatestVersionLabel(catalog, locale);

  const createdAt = sorted.reduce(
    (min, m) => (new Date(m.createdAt) < new Date(min) ? m.createdAt : min),
    sorted[0]!.createdAt
  );

  return {
    bundleKey,
    displayTitle,
    normalizedTitle,
    projectType,
    memberProjectIds: sorted.map((m) => m.id),
    members: sorted,
    catalog,
    languagesLabel,
    latestVersionLabel,
    createdAt,
    updatedAt: lead.updatedAt,
    thumbnailUrl: lead.thumbnailUrl?.trim() || lead.thumbnailFallbackUrl?.trim() || null,
    status: lead.status,
    sourceProjectId: lead.sourceProjectId ?? null,
  };
}

export function groupProjectsIntoBundles(
  projects: BuildBundleInput[],
  params: { locale?: "en" | "nl" }
): ProjectBundleListItem[] {
  const groups = new Map<string, BuildBundleInput[]>();
  for (const project of projects) {
    const projectType = project.projectType ?? "classic";
    const normalized = normalizeProjectBundleName(project.title);
    const key = projectBundleGroupKey({
      ownerId: project.ownerId,
      projectType,
      normalizedTitle: normalized,
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
