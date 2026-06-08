import type { Prisma, StudioCharacter } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import { normalizeStudioIdentityStrength } from "@/lib/studio-memory-validation";
import { mapStudioWorldProfileSummary } from "@/lib/studio-world-profile-summary";
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
import { deleteStudioReferenceBlob } from "@/server/studio/studio-reference-blob";
import { assertWorldProfileOwnedByViewer } from "@/server/studio/studio-world-profile-service";
import { parseCharacterVoiceProfilesJson } from "@/lib/studio-character-voice";
import { appendCharacterVoiceHistoryIfChanged } from "@/server/studio/studio-character-voice-history";
import {
  archivePreviousPrimaryReference,
  buildCanonicalCharacterIdentity,
} from "@/lib/studio-character-canonical-references";
import { randomUUID } from "node:crypto";

const CHARACTER_INCLUDE = {
  worldProfile: { select: { id: true, name: true } },
} satisfies Prisma.StudioCharacterInclude;

type CharacterRow = Prisma.StudioCharacterGetPayload<{ include: typeof CHARACTER_INCLUDE }>;

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function mapStudioCharacterToListItem(
  row: CharacterRow | StudioCharacter,
  options?: { ownerEmail?: string }
): StudioCharacterListItem {
  const worldProfile =
    "worldProfile" in row ? mapStudioWorldProfileSummary(row.worldProfile) : null;
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
    appearanceMemory: row.appearanceMemory,
    personalityMemory: row.personalityMemory,
    continuityNotes: row.continuityNotes,
    defaultClothing: row.defaultClothing,
    defaultAccessories: row.defaultAccessories,
    visualKeywords: row.visualKeywords,
    primaryReferenceImageId: row.primaryReferenceImageId,
    referenceNotes: row.referenceNotes,
    identityStrength: normalizeStudioIdentityStrength(row.identityStrength),
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
    worldProfileId: row.worldProfileId,
    worldProfile,
    voiceEnabled: row.voiceEnabled,
    voiceProvider: row.voiceProvider,
    voiceProfile: row.voiceProfile,
    voiceLanguage: row.voiceLanguage,
    voiceGender: row.voiceGender,
    voiceDescription: row.voiceDescription,
    voiceNotes: row.voiceNotes,
    voiceLock: row.voiceLock,
    voiceProfilesByLanguage: parseCharacterVoiceProfilesJson(row.voiceProfilesJson),
    performanceEnabled: row.performanceEnabled,
    defaultSmileStrength: row.defaultSmileStrength,
    defaultBlinkRate: row.defaultBlinkRate,
    defaultHeadMovement: row.defaultHeadMovement,
    defaultMouthIntensity: row.defaultMouthIntensity,
    idleAnimationStyle: row.idleAnimationStyle,
    performanceNotes: row.performanceNotes,
    mouthAnimationEnabled: row.mouthAnimationEnabled,
    mouthClosedAssetUrl: row.mouthClosedAssetUrl,
    mouthSmallAssetUrl: row.mouthSmallAssetUrl,
    mouthMediumAssetUrl: row.mouthMediumAssetUrl,
    mouthWideAssetUrl: row.mouthWideAssetUrl,
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
  | "id"
  | "name"
  | "role"
  | "description"
  | "personality"
  | "referenceImageUrl"
  | "referenceStorageKey"
  | "primaryReferenceImageId"
  | "referenceNotes"
  | "visualKeywords"
  | "defaultClothing"
  | "appearanceMemory"
  | "worldProfileId"
> & {
  worldProfile?: { id: string; name: string } | null;
}): CharacterSnapshot {
  const base = {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description,
    personality: row.personality,
    referenceImageUrl: row.referenceImageUrl,
  };

  if ("referenceStorageKey" in row && row.referenceStorageKey) {
    return {
      ...base,
      canonicalIdentity: buildCanonicalCharacterIdentity({
        id: row.id,
        referenceImageUrl: row.referenceImageUrl,
        referenceStorageKey: row.referenceStorageKey,
        primaryReferenceImageId: row.primaryReferenceImageId ?? null,
        referenceNotes: row.referenceNotes ?? "",
        visualKeywords: row.visualKeywords ?? "",
        defaultClothing: row.defaultClothing ?? "",
        name: row.name,
        role: row.role,
        description: row.description,
        personality: row.personality,
        appearanceMemory: row.appearanceMemory ?? "",
        worldProfileId: row.worldProfileId ?? null,
        worldProfile: row.worldProfile ?? null,
      }),
    };
  }

  return base;
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
    include: {
      ...CHARACTER_INCLUDE,
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
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
    include: {
      ...CHARACTER_INCLUDE,
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
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

  const worldErr = await assertWorldProfileOwnedByViewer(
    validated.value.worldProfileId,
    ownerId
  );
  if (worldErr) {
    return { error: worldErr };
  }

  const slug = await resolveUniqueSlug(ownerId, validated.value.name);
  const primaryReferenceImageId =
    validated.value.primaryReferenceImageId ?? randomUUID();
  const row = await prisma.studioCharacter.create({
    data: {
      ownerId,
      name: validated.value.name,
      slug,
      role: validated.value.role,
      referenceImageUrl: validated.value.referenceImageUrl,
      referenceStorageKey: validated.value.referenceStorageKey,
      description: validated.value.description,
      personality: validated.value.personality,
      appearanceMemory: validated.value.appearanceMemory,
      personalityMemory: validated.value.personalityMemory,
      continuityNotes: validated.value.continuityNotes,
      defaultClothing: validated.value.defaultClothing,
      defaultAccessories: validated.value.defaultAccessories,
      visualKeywords: validated.value.visualKeywords,
      primaryReferenceImageId,
      referenceNotes: validated.value.referenceNotes,
      identityStrength: validated.value.identityStrength,
      continuityStrength: validated.value.continuityStrength,
      worldProfileId: validated.value.worldProfileId,
      voiceEnabled: validated.value.voiceEnabled,
      voiceProvider: validated.value.voiceProvider,
      voiceProfile: validated.value.voiceProfile,
      voiceLanguage: validated.value.voiceLanguage,
      voiceGender: validated.value.voiceGender,
      voiceDescription: validated.value.voiceDescription,
      voiceNotes: validated.value.voiceNotes,
      voiceLock: validated.value.voiceLock,
      voiceProfilesJson: validated.value.voiceProfilesJson ?? undefined,
      performanceEnabled: validated.value.performanceEnabled,
      defaultSmileStrength: validated.value.defaultSmileStrength,
      defaultBlinkRate: validated.value.defaultBlinkRate,
      defaultHeadMovement: validated.value.defaultHeadMovement,
      defaultMouthIntensity: validated.value.defaultMouthIntensity,
      idleAnimationStyle: validated.value.idleAnimationStyle,
      performanceNotes: validated.value.performanceNotes,
      isMascot: roleSetsMascotFlag(validated.value.role),
      isSystemCharacter: false,
    },
    include: CHARACTER_INCLUDE,
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
  const { voiceProfilesJson, worldProfileId, ...restPatch } = patch;
  const data: Prisma.StudioCharacterUncheckedUpdateInput = {
    ...restPatch,
    slug,
    isMascot: patch.role ? roleSetsMascotFlag(patch.role) : undefined,
  };
  if (worldProfileId !== undefined) {
    data.worldProfileId = worldProfileId;
  }
  if (voiceProfilesJson !== undefined) {
    data.voiceProfilesJson =
      voiceProfilesJson === null
        ? undefined
        : (voiceProfilesJson as Prisma.InputJsonValue);
  }

  const row = await prisma.studioCharacter.update({
    where: { id },
    data,
    include: CHARACTER_INCLUDE,
  });

  if (
    patch.voiceEnabled !== undefined ||
    patch.voiceProfile !== undefined ||
    patch.voiceLock !== undefined
  ) {
    await appendCharacterVoiceHistoryIfChanged(
      id,
      existing,
      row,
      patch.voiceLock !== undefined && patch.voiceLock !== existing.voiceLock
        ? "voice_lock_changed"
        : "voice_profile_updated"
    );
  }

  if (
    patch.referenceImageUrl &&
    patch.referenceImageUrl !== previousReferenceUrl
  ) {
    const archived = archivePreviousPrimaryReference({
      existing: {
        id: existing.id,
        referenceImageUrl: existing.referenceImageUrl,
        referenceStorageKey: existing.referenceStorageKey,
        primaryReferenceImageId: existing.primaryReferenceImageId,
        referenceNotes: existing.referenceNotes,
        visualKeywords: existing.visualKeywords,
        defaultClothing: existing.defaultClothing,
        name: existing.name,
        role: existing.role,
        description: existing.description,
        personality: existing.personality,
        appearanceMemory: existing.appearanceMemory,
        worldProfileId: existing.worldProfileId,
      },
      newReferenceImageUrl: patch.referenceImageUrl,
      newReferenceStorageKey: patch.referenceStorageKey ?? existing.referenceStorageKey,
    });
    await prisma.studioCharacter.update({
      where: { id },
      data: {
        referenceNotes: archived.referenceNotes,
        primaryReferenceImageId: archived.primaryReferenceImageId,
      },
    });
  }

  const refreshed = await prisma.studioCharacter.findUnique({
    where: { id },
    include: CHARACTER_INCLUDE,
  });

  return { character: mapStudioCharacterToDetail(refreshed ?? row) };
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
  await deleteStudioReferenceBlob(existing.referenceImageUrl);

  return { ok: true };
}
