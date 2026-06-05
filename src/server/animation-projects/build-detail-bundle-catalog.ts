import { prisma } from "@/lib/prisma";
import {
  buildProjectBundleFromMembers,
  type BuildBundleInput,
} from "@/lib/project-bundles";
import { resolveProjectBundleGroupKey, resolveProjectDisplayTitle } from "@/lib/project-display-title";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";
import {
  mapPrismaRowToAnimationProjectListItem,
  type GalleryListPrismaRow,
} from "@/server/animation-projects/gallery-list";
import { fetchGalleryProjectRows } from "@/server/animation-projects/fetch-gallery-projects";

const BUNDLE_GROUPING_CAP = 250;

export type DetailBundlePeerSummary = {
  id: string;
  title: string | null;
  bundleName: string | null;
  bundleKey: string | null;
  projectType: string;
  status: string;
};

export type DetailBundleCatalogResult = {
  bundleKey: string;
  bundleDisplayTitle: string;
  memberProjectIds: string[];
  catalog: MotionVersionCatalog;
  peers: DetailBundlePeerSummary[];
};

export async function buildDetailBundleCatalog(params: {
  project: {
    id: string;
    ownerId: string;
    title: string | null;
    bundleName: string | null;
    bundleKey: string | null;
    projectType: string | null;
  };
  locale: "en" | "nl";
}): Promise<DetailBundleCatalogResult> {
  const projectType = params.project.projectType ?? "classic";
  const targetGroupKey = resolveProjectBundleGroupKey({
    ownerId: params.project.ownerId,
    projectType,
    title: params.project.title,
    bundleName: params.project.bundleName,
    bundleKey: params.project.bundleKey,
  });

  const indexRows = await prisma.animationProject.findMany({
    where: { ownerId: params.project.ownerId, projectType },
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
      status: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const memberIndex = indexRows.filter(
    (row) =>
      resolveProjectBundleGroupKey({
        ownerId: row.ownerId,
        projectType: row.projectType ?? "classic",
        title: row.title,
        bundleName: row.bundleName,
        bundleKey: row.bundleKey,
      }) === targetGroupKey
  );

  if (!memberIndex.length) {
    return emptyDetailBundleResult(params, targetGroupKey);
  }

  const memberIds = memberIndex.map((r) => r.id);
  const [renderVersionRows, languageExportRows, galleryRows] = await Promise.all([
    prisma.projectRenderVersion.findMany({
      where: { projectId: { in: memberIds } },
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
      where: { projectId: { in: memberIds } },
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
      where: { id: { in: memberIds } },
      take: memberIds.length,
      skip: 0,
      listAll: false,
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
        includeOwnerEmail: false,
      }),
    ])
  );

  const cleanUrlByProject = new Map<string, string | null>();
  try {
    const cleanRows = await prisma.animationProject.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, instantCleanFinalVideoUrl: true },
    });
    for (const row of cleanRows) {
      cleanUrlByProject.set(row.id, row.instantCleanFinalVideoUrl?.trim() ?? null);
    }
  } catch {
    /* legacy DB */
  }

  const titleById = new Map(memberIndex.map((r) => [r.id, r.title]));
  const bundleNameById = new Map(memberIndex.map((r) => [r.id, r.bundleName]));
  const sourceById = new Map(memberIndex.map((r) => [r.id, r.sourceProjectId]));
  const statusById = new Map(memberIndex.map((r) => [r.id, r.status]));

  const buildInputs: BuildBundleInput[] = [];
  for (const index of memberIndex) {
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

  const bundle = buildProjectBundleFromMembers(buildInputs, {
    ownerId: params.project.ownerId,
    locale: params.locale,
  });

  if (!bundle) {
    return emptyDetailBundleResult(params, targetGroupKey);
  }

  return {
    bundleKey: bundle.bundleKey,
    bundleDisplayTitle: bundle.displayTitle,
    memberProjectIds: bundle.memberProjectIds,
    catalog: bundle.catalog,
    peers: memberIndex.map((row) => ({
      id: row.id,
      title: row.title,
      bundleName: bundleNameById.get(row.id) ?? null,
      bundleKey: row.bundleKey,
      projectType: row.projectType ?? projectType,
      status: statusById.get(row.id) ?? "unknown",
    })),
  };
}

function emptyDetailBundleResult(
  params: {
    project: {
      id: string;
      ownerId: string;
      title: string | null;
      bundleName: string | null;
    };
    locale: "en" | "nl";
  },
  bundleKey: string
): DetailBundleCatalogResult {
  const displayTitle = resolveProjectDisplayTitle(
    params.project.bundleName ?? params.project.title,
    params.locale
  );
  const emptyCatalog: MotionVersionCatalog = {
    languages: [],
    slotsByLanguage: {},
    defaultLanguageCode: "nl",
    defaultSelectionKey: null,
  };
  return {
    bundleKey,
    bundleDisplayTitle: displayTitle,
    memberProjectIds: [params.project.id],
    catalog: emptyCatalog,
    peers: [],
  };
}
