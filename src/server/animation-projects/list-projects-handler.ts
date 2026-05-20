import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { fetchGalleryProjectRows } from "@/server/animation-projects/fetch-gallery-projects";
import {
  mapPrismaRowToAnimationProjectListItem,
  type GalleryListPrismaRow,
} from "@/server/animation-projects/gallery-list";
import { prisma } from "@/lib/prisma";
import type { AnimationProjectListResponse } from "@/types/animation-api";

export type ProjectListFailedBody = {
  ok: false;
  code: "PROJECT_LIST_FAILED";
  message: string;
  requestId: string;
  error?: string;
};

const MAX_GALLERY_LIST_LIMIT = 50;

export async function listAnimationProjectsForUser(params: {
  ownerId?: string;
  listAll: boolean;
  page: number;
  limit: number;
  statusFilter?: string;
}): Promise<
  | { ok: true; body: AnimationProjectListResponse }
  | { ok: false; body: ProjectListFailedBody; status: number }
> {
  const requestId = randomUUID();
  const limit = Math.min(MAX_GALLERY_LIST_LIMIT, Math.max(1, params.limit));
  const page = params.page > 0 ? params.page : 1;
  const offset = (page - 1) * limit;

  const where: Prisma.AnimationProjectWhereInput = {};
  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }
  if (params.statusFilter) {
    where.status = params.statusFilter;
  }

  try {
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
