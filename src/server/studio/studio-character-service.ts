import type { StudioCharacter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextSlugCandidate, slugifyCharacterName } from "@/lib/studio-character-slug";
import { roleSetsMascotFlag } from "@/lib/studio-character-roles";
import {
  validateStudioCharacterCreateInput,
  validateStudioCharacterUpdateInput,
  type StudioCharacterCreateInput,
  type StudioCharacterUpdateInput,
} from "@/lib/studio-character-validation";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { StudioCharacterDetail, StudioCharacterListItem } from "@/types/studio-api";
import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import {
  studioCharacterViewerCanModify,
  studioCharacterViewerCanView,
} from "@/server/studio/studio-character-access";
import { deleteStudioCharacterReferenceBlob } from "@/server/studio/studio-character-blob";

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function mapStudioCharacterToListItem(
  row: StudioCharacter,
  options?: { ownerEmail?: string }
): StudioCharacterListItem {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: row.slug,
    role: row.role as StudioCharacterListItem["role"],
    description: row.description,
    personality: row.personality,
    referenceImageUrl: row.referenceImageUrl,
    isMascot: row.isMascot,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: options?.ownerEmail,
  };
}

export function mapStudioCharacterToDetail(
  row: StudioCharacter,
  options?: { ownerEmail?: string }
): StudioCharacterDetail {
  return {
    ...mapStudioCharacterToListItem(row, options),
    referenceStorageKey: row.referenceStorageKey,
    isSystemCharacter: row.isSystemCharacter,
  };
}

export function toCharacterSnapshot(row: Pick<
  StudioCharacter,
  "id" | "name" | "role" | "description" | "personality" | "referenceImageUrl"
>): CharacterSnapshot {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description,
    personality: row.personality,
    referenceImageUrl: row.referenceImageUrl,
  };
}

async function resolveUniqueSlug(ownerId: string, name: string): Promise<string> {
  const base = slugifyCharacterName(name);
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = nextSlugCandidate(base, attempt);
    const existing = await prisma.studioCharacter.findUnique({
      where: { ownerId_slug: { ownerId, slug } },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not allocate a unique slug.");
}

export async function listStudioCharacters(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioCharacterListItem[]> {
  const rows = await prisma.studioCharacter.findMany({
    where: canAccessAdmin(viewer) ? undefined : { ownerId: viewer.id },
    orderBy: { createdAt: "desc" },
    include: canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : undefined,
  });

  return rows.map((row) => {
    const ownerEmail =
      "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
        ? (row.owner as { email: string }).email
        : undefined;
    return mapStudioCharacterToListItem(row, { ownerEmail });
  });
}

export async function getStudioCharacterByIdForViewer(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioCharacterDetail | null> {
  const row = await prisma.studioCharacter.findUnique({
    where: { id },
    include: canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : undefined,
  });
  if (!row) {
    return null;
  }
  if (!studioCharacterViewerCanView(viewer, row)) {
    return null;
  }
  const ownerEmail =
    "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
      ? (row.owner as { email: string }).email
      : undefined;
  return mapStudioCharacterToDetail(row, { ownerEmail });
}

export async function createStudioCharacter(
  ownerId: string,
  raw: StudioCharacterCreateInput
): Promise<{ character: StudioCharacterDetail } | { error: ServiceError }> {
  const validated = validateStudioCharacterCreateInput(raw);
  if (!validated.ok) {
    return {
      error: serviceError(validated.code, validated.message, 400),
    };
  }

  const slug = await resolveUniqueSlug(ownerId, validated.value.name);
  const row = await prisma.studioCharacter.create({
    data: {
      ownerId,
      name: validated.value.name,
      slug,
      role: validated.value.role,
      description: validated.value.description,
      personality: validated.value.personality,
      referenceImageUrl: validated.value.referenceImageUrl,
      referenceStorageKey: validated.value.referenceStorageKey,
      isMascot: roleSetsMascotFlag(validated.value.role),
      isSystemCharacter: false,
    },
  });

  return { character: mapStudioCharacterToDetail(row) };
}

export async function updateStudioCharacter(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioCharacterUpdateInput
): Promise<{ character: StudioCharacterDetail } | { error: ServiceError }> {
  const existing = await prisma.studioCharacter.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Character not found.", 404) };
  }
  if (!studioCharacterViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const validated = validateStudioCharacterUpdateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  const patch = validated.value;
  let slug = existing.slug;
  if (patch.name && patch.name !== existing.name) {
    slug = await resolveUniqueSlug(existing.ownerId, patch.name);
  }

  const previousReferenceUrl = existing.referenceImageUrl;
  const row = await prisma.studioCharacter.update({
    where: { id },
    data: {
      ...patch,
      slug,
      isMascot: patch.role ? roleSetsMascotFlag(patch.role) : undefined,
    },
  });

  if (
    patch.referenceImageUrl &&
    patch.referenceImageUrl !== previousReferenceUrl
  ) {
    await deleteStudioCharacterReferenceBlob(previousReferenceUrl);
  }

  return { character: mapStudioCharacterToDetail(row) };
}

export async function deleteStudioCharacter(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const existing = await prisma.studioCharacter.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Character not found.", 404) };
  }
  if (!studioCharacterViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  await prisma.studioCharacter.delete({ where: { id } });
  await deleteStudioCharacterReferenceBlob(existing.referenceImageUrl);

  return { ok: true };
}
