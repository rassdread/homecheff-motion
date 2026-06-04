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

  const allBundles = groupProjectsIntoBundles(buildInputs, { locale: params.locale });
  const paged = paginateBundles(allBundles, params.page, params.limit);

  return {
    bundles: paged.items,
    page: params.page,
    limit: params.limit,
    total: paged.total,
    hasMore: paged.hasMore,
  };
}
