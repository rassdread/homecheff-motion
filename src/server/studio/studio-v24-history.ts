/**
 * SERVER_ONLY — owned history and a non-destructive workspace pointer.
 * Opening a legacy record reuses an existing StudioCreativeProject.
 * It does not copy media, change ownership, or rewrite the source row.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { creativeProjectKind } from "@/lib/studio-v23-intent";
import {
  creativeWorkflowForLegacy,
  historyHref,
  historyPresentation,
  isStudioOpenKind,
  safePreviewUrl,
  unifiedProjectHref,
  type StudioHistoryAction,
  type StudioHistoryKind,
  type StudioHistoryRole,
  type StudioOpenKind,
} from "@/lib/studio-v24-history";

export type StudioHistoryItem = {
  id: string;
  sourceType: "creative" | "storyboard" | "animation" | "image" | "character" | "asset";
  sourceId: string;
  title: string;
  kind: StudioHistoryKind;
  role: StudioHistoryRole;
  editable: boolean;
  action: StudioHistoryAction;
  href: string;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  status: string | null;
};

const PER_SOURCE = 12;

function titleOr(value: string | null | undefined, fallback: string) {
  const title = value?.trim() ?? "";
  return title || fallback;
}

export async function listStudioHistoryForOwner(ownerId: string, limit = 24): Promise<StudioHistoryItem[]> {
  const take = Math.min(40, Math.max(1, limit));
  const [creative, storyboards, animations, images, characters, assets] = await Promise.all([
    prisma.studioCreativeProject.findMany({
      where: { ownerId, status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        title: true,
        status: true,
        storyboardId: true,
        animationProjectId: true,
        editorCanvasProjectId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.studioStoryboard.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    }),
    prisma.animationProject.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.editorCanvasProject.findMany({
      where: { ownerId, status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, name: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.studioCharacter.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, name: true, referenceImageUrl: true, createdAt: true, updatedAt: true },
    }),
    prisma.studioLibraryAsset.findMany({
      where: {
        ownerId,
        deletedAt: null,
        status: { not: "deleted" },
        family: { in: ["image", "video", "voice", "music", "sfx"] },
      },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        title: true,
        family: true,
        status: true,
        previewUrl: true,
        downloadUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const linkedStoryboards = new Set(creative.map((row) => row.storyboardId).filter(Boolean));
  const linkedAnimations = new Set(creative.map((row) => row.animationProjectId).filter(Boolean));
  const linkedCanvases = new Set(creative.map((row) => row.editorCanvasProjectId).filter(Boolean));
  const items: StudioHistoryItem[] = [];

  for (const row of creative) {
    const creativeKind = creativeProjectKind(row);
    const presentation = historyPresentation({ sourceType: "creative", creativeKind });
    items.push({
      id: `creative:${row.id}`,
      sourceType: "creative",
      sourceId: row.id,
      title: titleOr(row.title, "Project"),
      ...presentation,
      href: historyHref({ sourceType: "creative", sourceId: row.id, creativeKind }),
      previewUrl: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      status: row.status,
    });
  }
  for (const row of storyboards) {
    if (linkedStoryboards.has(row.id)) continue;
    const presentation = historyPresentation({ sourceType: "storyboard" });
    items.push({
      id: `storyboard:${row.id}`,
      sourceType: "storyboard",
      sourceId: row.id,
      title: titleOr(row.title, "Storyboard"),
      ...presentation,
      href: historyHref({ sourceType: "storyboard", sourceId: row.id }),
      previewUrl: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      status: null,
    });
  }
  for (const row of animations) {
    if (linkedAnimations.has(row.id)) continue;
    const presentation = historyPresentation({ sourceType: "animation" });
    items.push({
      id: `animation:${row.id}`,
      sourceType: "animation",
      sourceId: row.id,
      title: titleOr(row.title, "Animation"),
      ...presentation,
      href: historyHref({ sourceType: "animation", sourceId: row.id }),
      previewUrl: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      status: row.status,
    });
  }
  for (const row of images) {
    if (linkedCanvases.has(row.id)) continue;
    const presentation = historyPresentation({ sourceType: "image" });
    items.push({
      id: `image:${row.id}`,
      sourceType: "image",
      sourceId: row.id,
      title: titleOr(row.name, "Image"),
      ...presentation,
      href: historyHref({ sourceType: "image", sourceId: row.id }),
      previewUrl: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      status: row.status,
    });
  }
  for (const row of characters) {
    const presentation = historyPresentation({ sourceType: "character" });
    items.push({
      id: `character:${row.id}`,
      sourceType: "character",
      sourceId: row.id,
      title: titleOr(row.name, "Character"),
      ...presentation,
      href: historyHref({ sourceType: "character", sourceId: row.id }),
      previewUrl: safePreviewUrl(row.referenceImageUrl),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      status: null,
    });
  }
  for (const row of assets) {
    const presentation = historyPresentation({ sourceType: "asset", family: row.family });
    items.push({
      id: `asset:${row.id}`,
      sourceType: "asset",
      sourceId: row.id,
      title: titleOr(row.title, "Asset"),
      ...presentation,
      href: historyHref({ sourceType: "asset", sourceId: row.id }),
      previewUrl: safePreviewUrl(row.previewUrl) ?? safePreviewUrl(row.downloadUrl),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      status: row.status,
    });
  }

  items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || (a.id < b.id ? -1 : 1));
  return items.slice(0, take);
}

export async function openLegacyRecordInStudio(ownerId: string, kind: string, sourceId: string) {
  if (!isStudioOpenKind(kind) || !sourceId.trim()) return null;
  if (kind === "character") {
    const character = await prisma.studioCharacter.findFirst({
      where: { id: sourceId, ownerId },
      select: { id: true },
    });
    if (!character) return null;
    return { href: `/studio/characters/${encodeURIComponent(character.id)}`, created: false, item: null };
  }
  if (kind === "asset") {
    const asset = await prisma.studioLibraryAsset.findFirst({
      where: { id: sourceId, ownerId, deletedAt: null },
      select: { id: true, title: true, family: true, previewUrl: true, downloadUrl: true, status: true },
    });
    if (!asset) return null;
    const presentation = historyPresentation({ sourceType: "asset", family: asset.family });
    return {
      href: null,
      created: false,
      item: {
        id: asset.id,
        title: titleOr(asset.title, "Asset"),
        family: asset.family,
        status: asset.status,
        previewUrl: safePreviewUrl(asset.previewUrl) ?? safePreviewUrl(asset.downloadUrl),
        ...presentation,
      },
    };
  }
  const linked = await ensureCreativeLink(ownerId, kind, sourceId);
  if (!linked) return null;
  return {
    href: unifiedProjectHref(linked.projectId, creativeWorkflowForLegacy(kind)),
    created: linked.created,
    item: null,
  };
}

async function ensureCreativeLink(
  ownerId: string,
  kind: Exclude<StudioOpenKind, "character" | "asset">,
  sourceId: string,
): Promise<{ projectId: string; created: boolean } | null> {
  const where =
    kind === "storyboard"
      ? { ownerId, storyboardId: sourceId }
      : kind === "animation"
        ? { ownerId, animationProjectId: sourceId }
        : { ownerId, editorCanvasProjectId: sourceId };
  const existing = await prisma.$transaction(async (tx) => {
    const found = await tx.studioCreativeProject.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (found) return { projectId: found.id, created: false as const };
    const source = await loadOwnedSource(tx, ownerId, kind, sourceId);
    if (!source) return null;
    const created = await tx.studioCreativeProject.create({
      data: {
        ownerId,
        title: source.title,
        description: "",
        status: "active",
        storyboardId: kind === "storyboard" ? sourceId : null,
        animationProjectId: kind === "animation" ? sourceId : null,
        editorCanvasProjectId: kind === "image" ? sourceId : null,
        metadataJson: { v24Adapter: true, sourceKind: kind, sourceId },
        lastOpenedAt: new Date(),
      },
      select: { id: true },
    });
    return { projectId: created.id, created: true as const };
  });
  return existing;
}

type HistoryDb = Prisma.TransactionClient;

async function loadOwnedSource(
  db: HistoryDb,
  ownerId: string,
  kind: Exclude<StudioOpenKind, "character" | "asset">,
  sourceId: string,
): Promise<{ title: string } | null> {
  if (kind === "storyboard") {
    const row = await db.studioStoryboard.findFirst({
      where: { id: sourceId, ownerId },
      select: { title: true },
    });
    return row ? { title: titleOr(row.title, "Storyboard") } : null;
  }
  if (kind === "animation") {
    const row = await db.animationProject.findFirst({
      where: { id: sourceId, ownerId },
      select: { title: true },
    });
    return row ? { title: titleOr(row.title, "Animation") } : null;
  }
  const row = await db.editorCanvasProject.findFirst({
    where: { id: sourceId, ownerId },
    select: { name: true },
  });
  return row ? { title: titleOr(row.name, "Image") } : null;
}
