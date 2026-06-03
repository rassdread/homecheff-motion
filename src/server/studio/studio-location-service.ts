import type { StudioLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextSlugCandidate, slugifyLocationName } from "@/lib/studio-location-slug";
import {
  validateStudioLocationCreateInput,
  validateStudioLocationUpdateInput,
  type StudioLocationCreateInput,
  type StudioLocationUpdateInput,
} from "@/lib/studio-location-validation";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { StudioLocationDetail, StudioLocationListItem } from "@/types/studio-api";
import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import {
  studioLocationViewerCanModify,
  studioLocationViewerCanView,
} from "@/server/studio/studio-location-access";
import { deleteStudioCharacterReferenceBlob } from "@/server/studio/studio-character-blob";

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function mapStudioLocationToListItem(
  row: StudioLocation,
  options?: { ownerEmail?: string }
): StudioLocationListItem {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: row.slug,
    category: row.category as StudioLocationListItem["category"],
    description: row.description,
    referenceImageUrl: row.referenceImageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: options?.ownerEmail,
  };
}

export function mapStudioLocationToDetail(
  row: StudioLocation,
  options?: { ownerEmail?: string }
): StudioLocationDetail {
  return {
    ...mapStudioLocationToListItem(row, options),
    referenceStorageKey: row.referenceStorageKey,
    isSystemLocation: row.isSystemLocation,
  };
}

export function toLocationSnapshot(
  row: Pick<StudioLocation, "id" | "name" | "category" | "description" | "referenceImageUrl">
): LocationSnapshot {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    referenceImageUrl: row.referenceImageUrl,
  };
}

async function resolveUniqueSlug(ownerId: string, name: string): Promise<string> {
  const base = slugifyLocationName(name);
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = nextSlugCandidate(base, attempt);
    const existing = await prisma.studioLocation.findUnique({
      where: { ownerId_slug: { ownerId, slug } },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not allocate a unique slug.");
}

export async function listStudioLocations(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioLocationListItem[]> {
  const rows = await prisma.studioLocation.findMany({
    where: canAccessAdmin(viewer) ? undefined : { ownerId: viewer.id },
    orderBy: { createdAt: "desc" },
    include: canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : undefined,
  });

  return rows.map((row) => {
    const ownerEmail =
      "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
        ? (row.owner as { email: string }).email
        : undefined;
    return mapStudioLocationToListItem(row, { ownerEmail });
  });
}

export async function getStudioLocationById(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioLocationDetail | null> {
  const row = await prisma.studioLocation.findUnique({
    where: { id },
    include: canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : undefined,
  });
  if (!row) {
    return null;
  }
  if (!studioLocationViewerCanView(viewer, row)) {
    return null;
  }
  const ownerEmail =
    "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
      ? (row.owner as { email: string }).email
      : undefined;
  return mapStudioLocationToDetail(row, { ownerEmail });
}

export async function createStudioLocation(
  ownerId: string,
  raw: StudioLocationCreateInput
): Promise<{ location: StudioLocationDetail } | { error: ServiceError }> {
  const validated = validateStudioLocationCreateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  const slug = await resolveUniqueSlug(ownerId, validated.value.name);
  const row = await prisma.studioLocation.create({
    data: {
      ownerId,
      name: validated.value.name,
      slug,
      category: validated.value.category,
      description: validated.value.description,
      referenceImageUrl: validated.value.referenceImageUrl,
      referenceStorageKey: validated.value.referenceStorageKey,
      isSystemLocation: false,
    },
  });

  return { location: mapStudioLocationToDetail(row) };
}

export async function updateStudioLocation(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioLocationUpdateInput
): Promise<{ location: StudioLocationDetail } | { error: ServiceError }> {
  const existing = await prisma.studioLocation.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Location not found.", 404) };
  }
  if (!studioLocationViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const validated = validateStudioLocationUpdateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  const patch = validated.value;
  let slug = existing.slug;
  if (patch.name && patch.name !== existing.name) {
    slug = await resolveUniqueSlug(existing.ownerId, patch.name);
  }

  const previousReferenceUrl = existing.referenceImageUrl;
  const row = await prisma.studioLocation.update({
    where: { id },
    data: { ...patch, slug },
  });

  if (patch.referenceImageUrl && patch.referenceImageUrl !== previousReferenceUrl) {
    await deleteStudioCharacterReferenceBlob(previousReferenceUrl);
  }

  return { location: mapStudioLocationToDetail(row) };
}

export async function deleteStudioLocation(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const existing = await prisma.studioLocation.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Location not found.", 404) };
  }
  if (!studioLocationViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  await prisma.studioLocation.delete({ where: { id } });
  await deleteStudioCharacterReferenceBlob(existing.referenceImageUrl);

  return { ok: true };
}
