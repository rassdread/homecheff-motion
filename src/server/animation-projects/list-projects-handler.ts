import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { buildCompletedGalleryWhere } from "@/server/animation-projects/gallery-completed-where";
import { fetchGalleryProjectRows } from "@/server/animation-projects/fetch-gallery-projects";
import {
  mapPrismaRowToAnimationProjectListItem,
  type GalleryListPrismaRow,
} from "@/server/animation-projects/gallery-list";
import { parseFullRerenderDraftPayload } from "@/lib/full-rerender-draft";
import { buildDraftLineage } from "@/lib/draft-lineage";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";
import { prisma } from "@/lib/prisma";
import { listGalleryProjectBundles } from "@/server/animation-projects/build-gallery-bundles";
import { isPrismaDraftStorageError } from "@/server/animation-projects/prisma-schema-compat";
import type { AnimationProjectListResponse } from "@/types/animation-api";

export type ProjectListFailedBody = {
  ok: false;
  code: "PROJECT_LIST_FAILED";
  message: string;
  requestId: string;
  error?: string;
};

const MAX_GALLERY_LIST_LIMIT = 50;

export type GallerySection = "completed" | "concepts";

export async function listAnimationProjectsForUser(params: {
  ownerId?: string;
  listAll: boolean;
  page: number;
  limit: number;
  statusFilter?: string;
  gallerySection?: GallerySection;
  locale?: "en" | "nl";
}): Promise<
  | { ok: true; body: AnimationProjectListResponse }
  | { ok: false; body: ProjectListFailedBody; status: number }
> {
  const requestId = randomUUID();
  const limit = Math.min(MAX_GALLERY_LIST_LIMIT, Math.max(1, params.limit));
  const page = params.page > 0 ? params.page : 1;
  const offset = (page - 1) * limit;

  const section = params.gallerySection ?? "completed";
  const where: Prisma.AnimationProjectWhereInput = {};
  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }
  if (params.statusFilter) {
    where.status = params.statusFilter;
  }
  if (section === "completed") {
    Object.assign(where, buildCompletedGalleryWhere(where));
  }

  try {
    if (section === "concepts") {
      const conceptWhere: Prisma.AnimationProjectWhereInput = {
        ...(params.ownerId ? { ownerId: params.ownerId } : {}),
        OR: [{ status: "draft" }, { fullRerenderDraft: { isNot: null } }],
      };
      try {
        const [rows, total] = await Promise.all([
          fetchGalleryProjectRows({
            where: conceptWhere,
            take: limit,
            skip: offset,
            listAll: params.listAll,
          }),
          prisma.animationProject.count({ where: conceptWhere }),
        ]);

        const projectIds = rows.map((row) => row.id);
        const [draftPayloadRows, conceptMetaRows] = await Promise.all([
          projectIds.length > 0
            ? prisma.projectFullRerenderDraft.findMany({
                where: { projectId: { in: projectIds } },
              })
            : Promise.resolve([]),
          projectIds.length > 0
            ? prisma.animationProject.findMany({
                where: { id: { in: projectIds } },
                select: {
                  id: true,
                  sourceProjectId: true,
                  sourceLanguage: true,
                  sourceVersion: true,
                  draftCopiedAt: true,
                  title: true,
                  updatedAt: true,
                  status: true,
                },
              })
            : Promise.resolve([]),
        ]);
        const sourceIds = [
          ...new Set(
            conceptMetaRows
              .map((r) => r.sourceProjectId)
              .filter((id): id is string => Boolean(id?.trim()))
          ),
        ];
        const sourceTitleRows =
          sourceIds.length > 0
            ? await prisma.animationProject.findMany({
                where: { id: { in: sourceIds } },
                select: { id: true, title: true },
              })
            : [];
        const sourceTitleById = new Map(sourceTitleRows.map((r) => [r.id, r.title]));
        const draftByProject = new Map(draftPayloadRows.map((row) => [row.projectId, row]));
        const metaByProject = new Map(conceptMetaRows.map((row) => [row.id, row]));
        const locale = params.locale ?? "nl";

        const projects = rows
          .map((galleryRow) => {
            try {
              const item = mapPrismaRowToAnimationProjectListItem(
                galleryRow as GalleryListPrismaRow,
                { includeOwnerEmail: params.listAll }
              );
              const draftRow = draftByProject.get(galleryRow.id);
              const meta = metaByProject.get(galleryRow.id);
              const payload = draftRow ? parseFullRerenderDraftPayload(draftRow.payload) : null;
              const sceneCount =
                payload?.slots.filter((s) => s.image !== null).length ??
                galleryRow._count.images;
              const draftLineage =
                meta?.sourceProjectId
                  ? buildDraftLineage({
                      sourceProjectId: meta.sourceProjectId,
                      sourceProjectTitle: sourceTitleById.get(meta.sourceProjectId) ?? null,
                      sourceLanguage: meta.sourceLanguage,
                      sourceVersion: meta.sourceVersion,
                      copiedAt: meta.draftCopiedAt,
                      locale,
                    })
                  : null;
              return {
                ...item,
                title: meta?.title?.trim() || item.title || null,
                displayTitle: resolveProjectDisplayTitle(meta?.title ?? item.title, locale),
                status: meta?.status ?? item.status,
                sourceProjectId: meta?.sourceProjectId ?? null,
                draftLineage: draftLineage ?? undefined,
                fullRerenderDraft: {
                  updatedAt: (draftRow?.updatedAt ?? meta?.updatedAt ?? new Date()).toISOString(),
                  sceneCount,
                  versionNote: payload?.versionNote.trim() || null,
                },
              };
            } catch (mapError) {
              console.error("[gallery-list]", {
                phase: "serializeConceptRowSkipped",
                projectId: galleryRow.id,
                requestId,
                message: mapError instanceof Error ? mapError.message : String(mapError),
              });
              return null;
            }
          })
          .filter((p): p is NonNullable<typeof p> => p != null);

        return {
          ok: true,
          body: {
            projects,
            page,
            limit,
            total,
            hasMore: offset + rows.length < total,
            gallerySection: section,
          },
        };
      } catch (draftListError) {
        if (isPrismaDraftStorageError(draftListError)) {
          console.error("[gallery-list]", {
            phase: "conceptsDraftStorageUnavailable",
            requestId,
          });
          return {
            ok: true,
            body: {
              projects: [],
              page,
              limit,
              total: 0,
              hasMore: false,
              gallerySection: section,
            },
          };
        }
        throw draftListError;
      }
    }

    const locale = params.locale ?? "nl";
    const bundleResult = await listGalleryProjectBundles({
      where,
      page,
      limit,
      listAll: params.listAll,
      locale,
    });

    const bundles = bundleResult.bundles.map((bundle) => ({
      bundleKey: bundle.bundleKey,
      displayTitle: bundle.displayTitle,
      bundleName: bundle.bundleName,
      normalizedTitle: bundle.normalizedTitle,
      projectType: bundle.projectType,
      memberProjectIds: bundle.memberProjectIds,
      languagesLabel: bundle.languagesLabel,
      latestVersionLabel: bundle.latestVersionLabel,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
      thumbnailUrl: bundle.thumbnailUrl,
      status: bundle.status,
      sourceProjectId: bundle.sourceProjectId,
      activeProjectId: bundle.members[0]?.id ?? bundle.memberProjectIds[0] ?? "",
      catalog: {
        languages: bundle.catalog.languages,
        slotsByLanguage: Object.fromEntries(
          Object.entries(bundle.catalog.slotsByLanguage).map(([code, slots]) => [
            code,
            slots.map((slot) => ({
              selectionKey: slot.selectionKey,
              projectId: slot.projectId,
              languageCode: slot.languageCode,
              languageLabel: slot.languageLabel,
              versionNumber: slot.versionNumber,
              versionNote: slot.versionNote,
              displayLabel: slot.displayLabel,
              status: slot.status,
              finalVideoUrl: slot.finalVideoUrl,
              cleanVideoUrl: slot.cleanVideoUrl,
              kind: slot.kind,
            })),
          ])
        ),
        defaultLanguageCode: bundle.catalog.defaultLanguageCode,
        defaultSelectionKey: bundle.catalog.defaultSelectionKey,
      },
    }));

    const projects = bundleResult.bundles.flatMap((bundle) =>
      bundle.members.map((member) => ({
        ...member,
        displayTitle: member.displayTitle ?? resolveProjectDisplayTitle(member.title, locale),
      }))
    );

    return {
      ok: true,
      body: {
        projects,
        bundles,
        page: bundleResult.page,
        limit: bundleResult.limit,
        total: bundleResult.total,
        hasMore: bundleResult.hasMore,
        gallerySection: section,
      },
    };
  } catch (error) {
    const logMessage = error instanceof Error ? error.message : String(error);
    console.error("[gallery-list]", {
      phase: "listFailed",
      requestId,
      logMessage: logMessage.slice(0, 500),
    });
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        code: "PROJECT_LIST_FAILED",
        message: "Video's laden mislukt.",
        requestId,
        error: process.env.NODE_ENV === "development" ? logMessage : undefined,
      },
    };
  }
}
