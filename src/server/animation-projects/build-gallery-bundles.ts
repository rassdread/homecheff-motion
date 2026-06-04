import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  groupProjectsIntoBundles,
  paginateBundles,
  type BuildBundleInput,
  type ProjectBundleListItem,
} from "@/lib/project-bundles";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";
import {
  mapPrismaRowToAnimationProjectListItem,
  type GalleryListPrismaRow,
} from "@/server/animation-projects/gallery-list";
import { fetchGalleryProjectRows } from "@/server/animation-projects/fetch-gallery-projects";
import {
  badgeContextForProject,
  resolveBundleVersionBadges,
  type BundleVersionBadge,
} from "@/lib/bundle-version-badges";
import { resolveBundleFolderId } from "@/lib/bundle-folder";

const BUNDLE_GROUPING_CAP = 250;

export type GalleryBundleListResult = {
  bundles: ProjectBundleListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export async function listGalleryProjectBundles(params: {
  where: Prisma.AnimationProjectWhereInput;
  page: number;
  limit: number;
  listAll: boolean;
  locale: "en" | "nl";
}): Promise<GalleryBundleListResult> {
  const indexRows = await prisma.animationProject.findMany({
    where: params.where,
    orderBy: { updatedAt: "desc" },
    take: BUNDLE_GROUPING_CAP,
    select: {
      id: true,
      ownerId: true,
      title: true,
      bundleName: true,
      bundleKey: true,
      projectType: true,
      sourceProjectId: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!indexRows.length) {
    return {
      bundles: [],
      page: params.page,
      limit: params.limit,
      total: 0,
      hasMore: false,
    };
  }

  const allIds = indexRows.map((r) => r.id);
  const [renderVersionRows, languageExportRows, galleryRows] = await Promise.all([
    prisma.projectRenderVersion.findMany({
      where: { projectId: { in: allIds } },
      orderBy: [{ projectId: "asc" }, { renderVersionNumber: "asc" }],
      select: {
        id: true,
        projectId: true,
        renderVersionNumber: true,
        status: true,
        isDefault: true,
        versionNote: true,
        finalVideoUrl: true,
        cleanVideoUrl: true,
        createdAt: true,
      },
    }),
    prisma.videoLanguageExport.findMany({
      where: { projectId: { in: allIds } },
      orderBy: [{ projectId: "asc" }, { languageCode: "asc" }, { version: "asc" }],
      select: {
        id: true,
        projectId: true,
        languageCode: true,
        languageLabel: true,
        status: true,
        outputVideoUrl: true,
        sourceCleanVideoUrl: true,
        version: true,
        isDefault: true,
        versionNote: true,
        createdAt: true,
      },
    }),
    fetchGalleryProjectRows({
      where: { id: { in: allIds } },
      take: allIds.length,
      skip: 0,
      listAll: params.listAll,
    }),
  ]);

  const renderByProject = new Map<string, BuildBundleInput["renderVersions"]>();
  for (const row of renderVersionRows) {
    const list = renderByProject.get(row.projectId) ?? [];
    list.push({
      id: row.id,
      renderVersionNumber: row.renderVersionNumber,
      status: row.status,
      isDefault: row.isDefault,
      versionNote: row.versionNote,
      finalVideoUrl: row.finalVideoUrl,
      cleanVideoUrl: row.cleanVideoUrl,
      createdAt: row.createdAt.toISOString(),
    });
    renderByProject.set(row.projectId, list);
  }

  const langByProject = new Map<string, BuildBundleInput["languageExports"]>();
  for (const row of languageExportRows) {
    const list = langByProject.get(row.projectId) ?? [];
    list.push({
      id: row.id,
      languageCode: row.languageCode,
      languageLabel: row.languageLabel,
      status: row.status,
      outputVideoUrl: row.outputVideoUrl,
      sourceCleanVideoUrl: row.sourceCleanVideoUrl,
      version: row.version,
      isDefault: row.isDefault,
      versionNote: row.versionNote,
      createdAt: row.createdAt.toISOString(),
    });
    langByProject.set(row.projectId, list);
  }

  const galleryById = new Map(
    galleryRows.map((row) => [
      row.id,
      mapPrismaRowToAnimationProjectListItem(row as GalleryListPrismaRow, {
        includeOwnerEmail: params.listAll,
      }),
    ])
  );

  const cleanUrlByProject = new Map<string, string | null>();
  try {
    const cleanRows = await prisma.animationProject.findMany({
      where: { id: { in: allIds } },
      select: { id: true, instantCleanFinalVideoUrl: true },
    });
    for (const row of cleanRows) {
      cleanUrlByProject.set(row.id, row.instantCleanFinalVideoUrl?.trim() ?? null);
    }
  } catch {
    /* column may be missing on legacy DB */
  }

  const titleById = new Map(indexRows.map((r) => [r.id, r.title]));
  const bundleNameById = new Map(indexRows.map((r) => [r.id, r.bundleName]));
  const sourceById = new Map(indexRows.map((r) => [r.id, r.sourceProjectId]));

  const buildInputs: BuildBundleInput[] = [];
  for (const index of indexRows) {
    const base = galleryById.get(index.id);
    if (!base) {
      continue;
    }
    buildInputs.push({
      ...base,
      ownerId: index.ownerId,
      bundleName: index.bundleName,
      bundleKey: index.bundleKey,
      title: titleById.get(index.id) ?? null,
      displayTitle: resolveProjectDisplayTitle(titleById.get(index.id), params.locale),
      sourceProjectId: sourceById.get(index.id) ?? null,
      renderVersions: renderByProject.get(index.id) ?? [],
      languageExports: langByProject.get(index.id) ?? [],
      instantCleanFinalVideoUrl: cleanUrlByProject.get(index.id) ?? null,
    });
  }

  const renderCountByProject = new Map<string, number>();
  for (const row of renderVersionRows) {
    renderCountByProject.set(row.projectId, (renderCountByProject.get(row.projectId) ?? 0) + 1);
  }
  const langExportCountByProject = new Map<string, number>();
  for (const row of languageExportRows) {
    langExportCountByProject.set(
      row.projectId,
      (langExportCountByProject.get(row.projectId) ?? 0) + 1
    );
  }

  let badgeRows: Array<{
    id: string;
    studioSourceStoryboardId: string | null;
    studioHandoffJson: unknown;
    instantMode: string | null;
    status: string;
    _count: { images: number };
  }> = [];
  try {
    badgeRows = await prisma.animationProject.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        studioSourceStoryboardId: true,
        studioHandoffJson: true,
        instantMode: true,
        status: true,
        _count: { select: { images: true } },
      },
    });
  } catch {
    /* legacy DB */
  }

  const badgesByProjectId: Record<string, BundleVersionBadge[]> = {};
  for (const row of badgeRows) {
    const folderId = resolveBundleFolderId({
      bundleName: bundleNameById.get(row.id) ?? null,
      displayTitle: resolveProjectDisplayTitle(titleById.get(row.id), params.locale),
    });
    const ctx = badgeContextForProject({
      id: row.id,
      studioSourceStoryboardId: row.studioSourceStoryboardId,
      studioHandoffJson: row.studioHandoffJson,
      instantMode: row.instantMode,
      imageCount: row._count.images,
      status: row.status,
      renderVersionCount: renderCountByProject.get(row.id) ?? 0,
      languageExportCount: langExportCountByProject.get(row.id) ?? 0,
      folderId,
    });
    badgesByProjectId[row.id] = resolveBundleVersionBadges(ctx, row.studioHandoffJson);
  }

  const allBundles = groupProjectsIntoBundles(buildInputs, { locale: params.locale }).map(
    (bundle) => ({
      ...bundle,
      badgesByProjectId: Object.fromEntries(
        bundle.memberProjectIds
          .filter((pid) => badgesByProjectId[pid])
          .map((pid) => [pid, badgesByProjectId[pid]!])
      ),
    })
  );
  const paged = paginateBundles(allBundles, params.page, params.limit);

  return {
    bundles: paged.items,
    page: params.page,
    limit: params.limit,
    total: paged.total,
    hasMore: paged.hasMore,
  };
}
