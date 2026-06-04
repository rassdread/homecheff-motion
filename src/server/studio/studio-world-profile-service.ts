import type { StudioWorldProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextSlugCandidate, slugifyStudioAssetName } from "@/lib/studio-asset-slug";
import {
  validateStudioWorldProfileCreateInput,
  validateStudioWorldProfileUpdateInput,
  type StudioWorldProfileCreateInput,
  type StudioWorldProfileUpdateInput,
} from "@/lib/studio-world-profile-validation";
import type {
  StudioWorldProfileDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import {
  studioWorldProfileViewerCanModify,
  studioWorldProfileViewerCanView,
} from "@/server/studio/studio-world-profile-access";
import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

function slugifyWorldName(name: string): string {
  return slugifyStudioAssetName(name);
}

export function mapStudioWorldProfileToListItem(
  row: StudioWorldProfile,
  options?: { ownerEmail?: string }
): StudioWorldProfileListItem {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    visualStyle: row.visualStyle,
    tone: row.tone,
    continuityRules: row.continuityRules,
    continuityStrength: normalizeStudioContinuityStrength(
      row.continuityStrength
    ) as StudioContinuityStrength,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: options?.ownerEmail,
  };
}

export function mapStudioWorldProfileToDetail(
  row: StudioWorldProfile,
  options?: { ownerEmail?: string }
): StudioWorldProfileDetail {
  return mapStudioWorldProfileToListItem(row, options);
}

async function resolveUniqueSlug(ownerId: string, name: string): Promise<string> {
  const base = slugifyWorldName(name);
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = nextSlugCandidate(base, attempt);
    const existing = await prisma.studioWorldProfile.findUnique({
      where: { ownerId_slug: { ownerId, slug } },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not allocate a unique slug.");
}

export async function listStudioWorldProfiles(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioWorldProfileListItem[]> {
  const rows = await prisma.studioWorldProfile.findMany({
    where: canAccessAdmin(viewer) ? undefined : { ownerId: viewer.id },
    orderBy: { createdAt: "desc" },
    include: canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : undefined,
  });

  return rows.map((row) => {
    const ownerEmail =
      "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
        ? (row.owner as { email: string }).email
        : undefined;
    return mapStudioWorldProfileToListItem(row, { ownerEmail });
  });
}

export async function getStudioWorldProfileByIdForViewer(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioWorldProfileDetail | null> {
  const row = await prisma.studioWorldProfile.findUnique({
    where: { id },
    include: canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : undefined,
  });
  if (!row) {
    return null;
  }
  if (!studioWorldProfileViewerCanView(viewer, row)) {
    return null;
  }
  const ownerEmail =
    "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
      ? (row.owner as { email: string }).email
      : undefined;
  return mapStudioWorldProfileToDetail(row, { ownerEmail });
}

export async function createStudioWorldProfile(
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioWorldProfileCreateInput
): Promise<{ world: StudioWorldProfileDetail } | { error: ServiceError }> {
  const validated = validateStudioWorldProfileCreateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }
  const slug = await resolveUniqueSlug(viewer.id, validated.value.name);
  const row = await prisma.studioWorldProfile.create({
    data: {
      ownerId: viewer.id,
      slug,
      ...validated.value,
    },
  });
  return { world: mapStudioWorldProfileToDetail(row) };
}

export async function updateStudioWorldProfile(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioWorldProfileUpdateInput
): Promise<{ world: StudioWorldProfileDetail } | { error: ServiceError }> {
  const existing = await prisma.studioWorldProfile.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "World profile not found.", 404) };
  }
  if (!studioWorldProfileViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Not allowed to edit this world.", 403) };
  }
  const validated = validateStudioWorldProfileUpdateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }
  const patch = validated.value;
  const slug =
    patch.name !== undefined && patch.name !== existing.name
      ? await resolveUniqueSlug(existing.ownerId, patch.name)
      : undefined;
  const row = await prisma.studioWorldProfile.update({
    where: { id },
    data: {
      ...patch,
      ...(slug ? { slug } : {}),
    },
  });
  return { world: mapStudioWorldProfileToDetail(row) };
}

export async function deleteStudioWorldProfile(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const existing = await prisma.studioWorldProfile.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "World profile not found.", 404) };
  }
  if (!studioWorldProfileViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Not allowed to delete this world.", 403) };
  }
  await prisma.studioWorldProfile.delete({ where: { id } });
  return { ok: true };
}

export async function assertWorldProfileOwnedByViewer(
  worldProfileId: string | null | undefined,
  viewerId: string
): Promise<ServiceError | null> {
  if (!worldProfileId) {
    return null;
  }
  const world = await prisma.studioWorldProfile.findUnique({
    where: { id: worldProfileId },
    select: { ownerId: true },
  });
  if (!world) {
    return serviceError("INVALID_WORLD", "World profile not found.", 400);
  }
  if (world.ownerId !== viewerId) {
    return serviceError("INVALID_WORLD", "World profile does not belong to you.", 400);
  }
  return null;
}
