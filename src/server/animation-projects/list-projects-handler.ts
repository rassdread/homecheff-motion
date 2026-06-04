import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { buildCompletedGalleryWhere } from "@/server/animation-projects/gallery-completed-where";
import { fetchGalleryProjectRows } from "@/server/animation-projects/fetch-gallery-projects";
import {
  mapPrismaRowToAnimationProjectListItem,
  type GalleryListPrismaRow,
} from "@/server/animation-projects/gallery-list";
import { parseFullRerenderDraftPayload } from "@/lib/full-rerender-draft";
import { prisma } from "@/lib/prisma";
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
      let draftRows: Awaited<
        ReturnType<typeof prisma.projectFullRerenderDraft.findMany>
      >;
      let total: number;
      try {
        const draftWhere: Prisma.ProjectFullRerenderDraftWhereInput = {
          project: params.ownerId ? { ownerId: params.ownerId } : {},
        };
        [draftRows, total] = await Promise.all([
          prisma.projectFullRerenderDraft.findMany({
            where: draftWhere,
            orderBy: { updatedAt: "desc" },
            take: limit,
            skip: offset,
            include: {
              project: true,
            },
          }),
          prisma.projectFullRerenderDraft.count({ where: draftWhere }),
        ]);
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

      const projectIds = draftRows.map((row) => row.projectId);
      let galleryRows: Awaited<ReturnType<typeof fetchGalleryProjectRows>> = [];
      if (projectIds.length > 0) {
        try {
          galleryRows = await fetchGalleryProjectRows({
            where: { id: { in: projectIds } },
            take: projectIds.length,
            skip: 0,
            listAll: params.listAll,
          });
        } catch (galleryError) {
          console.error("[gallery-list]", {
            phase: "conceptsGalleryFetchFailed",
            requestId,
            message:
              galleryError instanceof Error ? galleryError.message.slice(0, 500) : String(galleryError),
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
      }
      const galleryById = new Map(galleryRows.map((row) => [row.id, row]));

      const projects = draftRows
        .map((draftRow) => {
          const galleryRow = galleryById.get(draftRow.projectId);
          if (!galleryRow) {
            return null;
          }
          try {
            const item = mapPrismaRowToAnimationProjectListItem(galleryRow as GalleryListPrismaRow, {
              includeOwnerEmail: params.listAll,
            });
            const payload = parseFullRerenderDraftPayload(draftRow.payload);
            return {
              ...item,
              fullRerenderDraft: payload
                ? {
                    updatedAt: draftRow.updatedAt.toISOString(),
                    sceneCount: payload.slots.filter((s) => s.image !== null).length,
                    versionNote: payload.versionNote.trim() || null,
                  }
                : {
                    updatedAt: draftRow.updatedAt.toISOString(),
                    sceneCount: 0,
                    versionNote: null,
                  },
            };
          } catch (mapError) {
            console.error("[gallery-list]", {
              phase: "serializeConceptRowSkipped",
              projectId: draftRow.projectId,
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
          hasMore: offset + draftRows.length < total,
          gallerySection: section,
        },
      };
    }

    const [rows, total] = await Promise.all([
      fetchGalleryProjectRows({
        where,
        take: limit,
        skip: offset,
        listAll: params.listAll,
      }),
      prisma.animationProject.count({ where }),
    ]);

    const projects = rows.map((row) => {
      try {
        return mapPrismaRowToAnimationProjectListItem(row as GalleryListPrismaRow, {
          includeOwnerEmail: params.listAll,
        });
      } catch (mapError) {
        console.error("[gallery-list]", {
          phase: "serializeRowSkipped",
          projectId: row.id,
          requestId,
          message: mapError instanceof Error ? mapError.message : String(mapError),
        });
        return null;
      }
    }).filter((p): p is NonNullable<typeof p> => p != null);

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
