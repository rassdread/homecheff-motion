import type { Prisma, StudioProp } from "@prisma/client";
import { registerPrismaEntityInLibrary } from "@/server/studio/library-consistency-hooks";
import { prisma } from "@/lib/prisma";
import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import { mapStudioWorldProfileSummary } from "@/lib/studio-world-profile-summary";
import { nextSlugCandidate, slugifyPropName } from "@/lib/studio-prop-slug";
import {
  validateStudioPropCreateInput,
  validateStudioPropUpdateInput,
  type StudioPropCreateInput,
  type StudioPropUpdateInput,
} from "@/lib/studio-prop-validation";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import type { StudioPropDetail, StudioPropListItem } from "@/types/studio-api";
import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import { studioPropViewerCanModify, studioPropViewerCanView } from "@/server/studio/studio-prop-access";
import { deleteStudioReferenceBlob } from "@/server/studio/studio-reference-blob";
import { assertWorldProfileOwnedByViewer } from "@/server/studio/studio-world-profile-service";

const PROP_INCLUDE = {
  worldProfile: { select: { id: true, name: true } },
} satisfies Prisma.StudioPropInclude;

type PropRow = Prisma.StudioPropGetPayload<{ include: typeof PROP_INCLUDE }>;

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function mapStudioPropToListItem(
  row: PropRow | StudioProp,
  options?: { ownerEmail?: string }
): StudioPropListItem {
  const worldProfile =
    "worldProfile" in row ? mapStudioWorldProfileSummary(row.worldProfile) : null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: row.slug,
    category: row.category as StudioPropListItem["category"],
    description: row.description,
    referenceImageUrl: row.referenceImageUrl,
    appearanceMemory: row.appearanceMemory,
    brandingRules: row.brandingRules,
    continuityNotes: row.continuityNotes,
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
    worldProfileId: row.worldProfileId,
    worldProfile,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: options?.ownerEmail,
  };
}

export function mapStudioPropToDetail(
  row: StudioProp,
  options?: { ownerEmail?: string }
): StudioPropDetail {
  return {
    ...mapStudioPropToListItem(row, options),
    referenceStorageKey: row.referenceStorageKey,
    isSystemProp: row.isSystemProp,
  };
}

export function toPropSnapshot(
  row: Pick<StudioProp, "id" | "name" | "category" | "description" | "referenceImageUrl">
): PropSnapshot {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    referenceImageUrl: row.referenceImageUrl,
  };
}

async function resolveUniqueSlug(ownerId: string, name: string): Promise<string> {
  const base = slugifyPropName(name);
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = nextSlugCandidate(base, attempt);
    const existing = await prisma.studioProp.findUnique({
      where: { ownerId_slug: { ownerId, slug } },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not allocate a unique slug.");
}

export async function listStudioProps(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioPropListItem[]> {
  const rows = await prisma.studioProp.findMany({
    where: canAccessAdmin(viewer) ? undefined : { ownerId: viewer.id },
    orderBy: { createdAt: "desc" },
    include: {
      ...PROP_INCLUDE,
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
  });

  return rows.map((row) => {
    const ownerEmail =
      "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
        ? (row.owner as { email: string }).email
        : undefined;
    return mapStudioPropToListItem(row, { ownerEmail });
  });
}

export async function getStudioPropById(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioPropDetail | null> {
  const row = await prisma.studioProp.findUnique({
    where: { id },
    include: {
      ...PROP_INCLUDE,
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
  });
  if (!row) {
    return null;
  }
  if (!studioPropViewerCanView(viewer, row)) {
    return null;
  }
  const ownerEmail =
    "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
      ? (row.owner as { email: string }).email
      : undefined;
  return mapStudioPropToDetail(row, { ownerEmail });
}

export async function createStudioProp(
  ownerId: string,
  raw: StudioPropCreateInput
): Promise<{ prop: StudioPropDetail } | { error: ServiceError }> {
  const validated = validateStudioPropCreateInput(raw);
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
  const row = await prisma.studioProp.create({
    data: {
      ownerId,
      name,
      slug,
      category,
      description,
      referenceImageUrl,
      referenceStorageKey,
      ...memoryData,
      isSystemProp: false,
    },
    include: PROP_INCLUDE,
  });

  await registerPrismaEntityInLibrary({
    ownerId,
    createdBy: ownerId,
    entityId: row.id,
    entityName: row.name,
    generationType: category === "brand_asset" ? "logo" : "prop",
    assetUrl: row.referenceImageUrl,
    storageKey: row.referenceStorageKey,
    thumbnailUrl: row.referenceImageUrl,
    isLogo: category === "brand_asset",
    sourceModule: "studio",
  });

  return { prop: mapStudioPropToDetail(row) };
}

export async function updateStudioProp(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioPropUpdateInput
): Promise<{ prop: StudioPropDetail } | { error: ServiceError }> {
  const existing = await prisma.studioProp.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Prop not found.", 404) };
  }
  if (!studioPropViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  const validated = validateStudioPropUpdateInput(raw);
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
  const row = await prisma.studioProp.update({
    where: { id },
    data: { ...patch, slug },
    include: PROP_INCLUDE,
  });

  if (patch.referenceImageUrl && patch.referenceImageUrl !== previousReferenceUrl) {
    await deleteStudioReferenceBlob(previousReferenceUrl);
  }

  return { prop: mapStudioPropToDetail(row) };
}

export async function deleteStudioProp(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const existing = await prisma.studioProp.findUnique({ where: { id } });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Prop not found.", 404) };
  }
  if (!studioPropViewerCanModify(viewer, existing)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }

  await prisma.studioProp.delete({ where: { id } });
  await deleteStudioReferenceBlob(existing.referenceImageUrl);

  return { ok: true };
}
