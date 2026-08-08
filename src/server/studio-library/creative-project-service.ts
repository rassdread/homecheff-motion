/**
 * SERVER_ONLY — S.5 canonical creative projects (lightweight containers).
 */

import { prisma } from "@/lib/prisma";
import type { StudioCreativeProjectStatus } from "@/lib/studio-library-types";
import type { Prisma } from "@prisma/client";

export type StudioCreativeProjectRow = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  status: string;
  pinned: boolean;
  favorite: boolean;
  storyboardId: string | null;
  animationProjectId: string | null;
  homeCheffProjectId: string | null;
  editorCanvasProjectId: string | null;
  coverAssetId: string | null;
  tagsJson: Prisma.JsonValue | null;
  metadataJson: Prisma.JsonValue | null;
  lastOpenedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createCreativeProject(input: {
  ownerId: string;
  title: string;
  description?: string;
  status?: StudioCreativeProjectStatus;
  storyboardId?: string | null;
  animationProjectId?: string | null;
  homeCheffProjectId?: string | null;
  editorCanvasProjectId?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<StudioCreativeProjectRow> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Project title is required.");
  }
  return prisma.studioCreativeProject.create({
    data: {
      ownerId: input.ownerId,
      title,
      description: (input.description ?? "").trim(),
      status: input.status ?? "active",
      storyboardId: input.storyboardId ?? null,
      animationProjectId: input.animationProjectId ?? null,
      homeCheffProjectId: input.homeCheffProjectId ?? null,
      editorCanvasProjectId: input.editorCanvasProjectId ?? null,
      tagsJson: (input.tags ?? undefined) as Prisma.InputJsonValue | undefined,
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      lastOpenedAt: new Date(),
    },
  });
}

export async function listCreativeProjectsForOwner(input: {
  ownerId: string;
  status?: StudioCreativeProjectStatus | "all";
  pinnedOnly?: boolean;
  favoriteOnly?: boolean;
  recent?: boolean;
  limit?: number;
}): Promise<StudioCreativeProjectRow[]> {
  const limit = Math.min(100, Math.max(1, input.limit ?? 40));
  const status = input.status ?? "active";
  return prisma.studioCreativeProject.findMany({
    where: {
      ownerId: input.ownerId,
      ...(status !== "all" ? { status } : {}),
      ...(input.pinnedOnly ? { pinned: true } : {}),
      ...(input.favoriteOnly ? { favorite: true } : {}),
    },
    orderBy: input.recent
      ? [{ lastOpenedAt: "desc" }, { updatedAt: "desc" }]
      : [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

export async function getCreativeProjectForOwner(
  projectId: string,
  ownerId: string
): Promise<StudioCreativeProjectRow | null> {
  return prisma.studioCreativeProject.findFirst({
    where: { id: projectId, ownerId },
  });
}

export async function updateCreativeProject(input: {
  projectId: string;
  ownerId: string;
  title?: string;
  description?: string;
  status?: StudioCreativeProjectStatus;
  pinned?: boolean;
  favorite?: boolean;
  coverAssetId?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  touchOpened?: boolean;
}): Promise<StudioCreativeProjectRow | null> {
  const existing = await getCreativeProjectForOwner(input.projectId, input.ownerId);
  if (!existing) return null;

  const archivedAt =
    input.status === "archived"
      ? existing.archivedAt ?? new Date()
      : input.status === "active" || input.status === "template"
        ? null
        : existing.archivedAt;

  return prisma.studioCreativeProject.update({
    where: { id: existing.id },
    data: {
      ...(input.title != null ? { title: input.title.trim() } : {}),
      ...(input.description != null ? { description: input.description.trim() } : {}),
      ...(input.status != null ? { status: input.status, archivedAt } : {}),
      ...(input.pinned != null ? { pinned: input.pinned } : {}),
      ...(input.favorite != null ? { favorite: input.favorite } : {}),
      ...(input.coverAssetId !== undefined ? { coverAssetId: input.coverAssetId } : {}),
      ...(input.tags != null ? { tagsJson: input.tags as Prisma.InputJsonValue } : {}),
      ...(input.metadata != null ? { metadataJson: input.metadata as Prisma.InputJsonValue } : {}),
      ...(input.touchOpened ? { lastOpenedAt: new Date() } : {}),
    },
  });
}

export async function archiveCreativeProject(
  projectId: string,
  ownerId: string
): Promise<StudioCreativeProjectRow | null> {
  return updateCreativeProject({
    projectId,
    ownerId,
    status: "archived",
  });
}
