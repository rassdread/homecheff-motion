import type { Prisma, StudioLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import { mapStudioWorldProfileSummary } from "@/lib/studio-world-profile-summary";
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
import { deleteStudioReferenceBlob } from "@/server/studio/studio-reference-blob";
import { assertWorldProfileOwnedByViewer } from "@/server/studio/studio-world-profile-service";

const LOCATION_INCLUDE = {
  worldProfile: { select: { id: true, name: true } },
} satisfies Prisma.StudioLocationInclude;

type LocationRow = Prisma.StudioLocationGetPayload<{ include: typeof LOCATION_INCLUDE }>;

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function mapStudioLocationToListItem(
  row: LocationRow | StudioLocation,
  options?: { ownerEmail?: string }
): StudioLocationListItem {
  const worldProfile =
    "worldProfile" in row ? mapStudioWorldProfileSummary(row.worldProfile) : null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: row.slug,
    category: row.category as StudioLocationListItem["category"],
    description: row.description,
    referenceImageUrl: row.referenceImageUrl,
    worldMemory: row.worldMemory,
    visualIdentity: row.visualIdentity,
    environmentKeywords: row.environmentKeywords,
    continuityNotes: row.continuityNotes,
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
    worldProfileId: row.worldProfileId,
    worldProfile,
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
    include: {
      ...LOCATION_INCLUDE,
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
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
    include: {
      ...LOCATION_INCLUDE,
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
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

  const worldErr = await assertWorldProfileOwnedByViewer(
    validated.value.worldProfileId,
    ownerId
  );
  if (worldErr) {
    return { error: worldErr };
  }

  const slug = await resolveUniqueSlug(ownerId, validated.value.name);
  const { name, category, referenceImageUrl, referenceStorageKey, description, ...memoryData } =
    validated.value;
  const row = await prisma.studioLocation.create({
    data: {
      ownerId,
      name,
      slug,
      category,
      description,
      referenceImageUrl,
      referenceStorageKey,
      ...memoryData,
      isSystemLocation: false,
    },
    include: LOCATION_INCLUDE,
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
  if (patch.worldProfileId !== undefined) {
    const worldErr = await assertWorldProfileOwnedByViewer(
      patch.worldProfileId,
      existing.ownerId
    );
    if (worldErr) {
      return { error: worldErr };
    }
  }

  let slug = existing.slug;
  if (patch.name && patch.name !== existing.name) {
    slug = await resolveUniqueSlug(existing.ownerId, patch.name);
  }

  const previousReferenceUrl = existing.referenceImageUrl;
  const row = await prisma.studioLocation.update({
    where: { id },
    data: { ...patch, slug },
    include: LOCATION_INCLUDE,
  });

  if (patch.referenceImageUrl && patch.referenceImageUrl !== previousReferenceUrl) {
    await deleteStudioReferenceBlob(previousReferenceUrl);
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
  await deleteStudioReferenceBlob(existing.referenceImageUrl);

  return { ok: true };
}
