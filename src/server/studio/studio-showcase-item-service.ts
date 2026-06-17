import { prisma } from "@/lib/prisma";
import type {
  ShowcaseMediaType,
  ShowcasePageKey,
  StudioShowcaseAdminFilters,
  StudioShowcaseItemInput,
  StudioShowcaseItemRecord,
} from "@/types/studio-showcase-item";

type PrismaShowcaseRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  pageKey: string;
  serviceKey: string | null;
  category: string | null;
  assistantPrompt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  locale: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: PrismaShowcaseRow): StudioShowcaseItemRecord {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    mediaType: row.mediaType as ShowcaseMediaType,
    mediaUrl: row.mediaUrl,
    thumbnailUrl: row.thumbnailUrl,
    posterUrl: row.posterUrl,
    pageKey: row.pageKey as ShowcasePageKey,
    serviceKey: row.serviceKey as StudioShowcaseItemRecord["serviceKey"],
    category: row.category,
    assistantPrompt: row.assistantPrompt,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    locale: row.locale,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildAdminWhere(filters: StudioShowcaseAdminFilters) {
  const where: {
    pageKey?: string;
    serviceKey?: string;
    isActive?: boolean;
    locale?: string;
  } = {};

  if (filters.pageKey?.trim()) {
    where.pageKey = filters.pageKey.trim();
  }
  if (filters.serviceKey?.trim()) {
    where.serviceKey = filters.serviceKey.trim();
  }
  if (typeof filters.active === "boolean") {
    where.isActive = filters.active;
  }
  if (filters.locale?.trim()) {
    where.locale = filters.locale.trim();
  }

  return where;
}

export async function listStudioShowcaseItemsAdmin(
  filters: StudioShowcaseAdminFilters = {}
): Promise<StudioShowcaseItemRecord[]> {
  const rows = await prisma.studioShowcaseItem.findMany({
    where: buildAdminWhere(filters),
    orderBy: [{ pageKey: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapRow);
}

export async function listStudioShowcaseItemsByPageKey(
  pageKey: string
): Promise<StudioShowcaseItemRecord[]> {
  const rows = await prisma.studioShowcaseItem.findMany({
    where: { pageKey, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapRow);
}

export async function createStudioShowcaseItem(
  input: StudioShowcaseItemInput,
  createdByUserId?: string | null
): Promise<StudioShowcaseItemRecord> {
  const row = await prisma.studioShowcaseItem.create({
    data: {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      description: input.description.trim(),
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl.trim(),
      thumbnailUrl: input.thumbnailUrl?.trim() || null,
      posterUrl: input.posterUrl?.trim() || null,
      pageKey: input.pageKey,
      serviceKey: input.serviceKey?.trim() || null,
      category: input.category?.trim() || null,
      assistantPrompt: input.assistantPrompt?.trim() || null,
      ctaLabel: input.ctaLabel?.trim() || null,
      ctaHref: input.ctaHref?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      locale: input.locale?.trim() || null,
      createdByUserId: createdByUserId ?? null,
    },
  });
  return mapRow(row);
}

export async function updateStudioShowcaseItem(
  id: string,
  input: Partial<StudioShowcaseItemInput>
): Promise<StudioShowcaseItemRecord | null> {
  const existing = await prisma.studioShowcaseItem.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const row = await prisma.studioShowcaseItem.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle?.trim() || null } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.mediaType !== undefined ? { mediaType: input.mediaType } : {}),
      ...(input.mediaUrl !== undefined ? { mediaUrl: input.mediaUrl.trim() } : {}),
      ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl?.trim() || null } : {}),
      ...(input.posterUrl !== undefined ? { posterUrl: input.posterUrl?.trim() || null } : {}),
      ...(input.pageKey !== undefined ? { pageKey: input.pageKey } : {}),
      ...(input.serviceKey !== undefined ? { serviceKey: input.serviceKey?.trim() || null } : {}),
      ...(input.category !== undefined ? { category: input.category?.trim() || null } : {}),
      ...(input.assistantPrompt !== undefined ?
        { assistantPrompt: input.assistantPrompt?.trim() || null }
      : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel?.trim() || null } : {}),
      ...(input.ctaHref !== undefined ? { ctaHref: input.ctaHref?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.startsAt !== undefined ?
        { startsAt: input.startsAt ? new Date(input.startsAt) : null }
      : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
      ...(input.locale !== undefined ? { locale: input.locale?.trim() || null } : {}),
    },
  });
  return mapRow(row);
}

export async function deleteStudioShowcaseItem(id: string): Promise<boolean> {
  const existing = await prisma.studioShowcaseItem.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }
  await prisma.studioShowcaseItem.delete({ where: { id } });
  return true;
}

export async function reorderStudioShowcaseItems(
  orderedIds: string[],
  pageKey: string
): Promise<StudioShowcaseItemRecord[]> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.studioShowcaseItem.updateMany({
        where: { id, pageKey },
        data: { sortOrder: index },
      })
    )
  );
  return listStudioShowcaseItemsByPageKey(pageKey);
}
