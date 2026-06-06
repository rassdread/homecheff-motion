import type { Prisma, StudioStoryboard } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  validateStudioStoryboardCreateInput,
  validateStudioStoryboardUpdateInput,
  type StudioStoryboardCreateInput,
  type StudioStoryboardUpdateInput,
} from "@/lib/studio-storyboard-validation";
import {
  validateStudioSceneCreateInput,
  validateStudioSceneUpdateInput,
  type StudioSceneCreateInput,
  type StudioSceneUpdateInput,
} from "@/lib/studio-scene-validation";
import { mapStudioCharacterToListItem, toCharacterSnapshot } from "@/server/studio/studio-character-service";
import { mapStudioLocationToListItem, toLocationSnapshot } from "@/server/studio/studio-location-service";
import { mapStudioPropToListItem, toPropSnapshot } from "@/server/studio/studio-prop-service";
import type { StoryboardSnapshot } from "@/types/studio-storyboard-snapshot";
import { normalizeAiDirectorStyleStrength } from "@/lib/studio-ai-director-interpreter";
import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import {
  normalizeStudioNarrationMode,
  normalizeStudioVoiceProfileId,
  voiceStyleFromProfile,
} from "@/lib/studio-voice-profiles";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import { mapStudioSceneImageToListItem } from "@/lib/studio-scene-image-map";
import type {
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioStoryboardListItem,
} from "@/types/studio-api";
import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import {
  studioStoryboardViewerCanModify,
  studioStoryboardViewerCanView,
} from "@/server/studio/studio-storyboard-access";

export type ServiceError = {
  code: string;
  message: string;
  httpStatus: number;
};

export const STUDIO_SCENE_DETAIL_INCLUDE = {
  location: { include: { worldProfile: { select: { id: true, name: true, description: true, visualStyle: true, tone: true, continuityRules: true, continuityStrength: true } } } },
  characters: {
    include: {
      character: {
        include: {
          worldProfile: {
            select: {
              id: true,
              name: true,
              description: true,
              visualStyle: true,
              tone: true,
              continuityRules: true,
              continuityStrength: true,
            },
          },
        },
      },
    },
  },
  props: {
    include: {
      prop: {
        include: {
          worldProfile: {
            select: {
              id: true,
              name: true,
              description: true,
              visualStyle: true,
              tone: true,
              continuityRules: true,
              continuityStrength: true,
            },
          },
        },
      },
    },
  },
  sceneImages: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.StudioSceneInclude;

const SCENE_INCLUDE = STUDIO_SCENE_DETAIL_INCLUDE;

export type StudioStoryboardSceneRow = Prisma.StudioSceneGetPayload<{
  include: typeof STUDIO_SCENE_DETAIL_INCLUDE;
}>;
type SceneRow = StudioStoryboardSceneRow;

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export function mapStudioSceneToDetail(row: SceneRow): StudioSceneDetail {
  return {
    id: row.id,
    storyboardId: row.storyboardId,
    order: row.order,
    title: row.title,
    description: row.description,
    action: row.action,
    emotion: row.emotion,
    camera: row.camera,
    shotType: row.shotType,
    cameraMovement: row.cameraMovement,
    sceneEnergy: normalizeStudioSceneEnergy(row.sceneEnergy),
    transitionToNext: row.transitionToNext,
    musicCueType: row.musicCueType ?? "",
    musicEnergyTarget: row.musicEnergyTarget ?? "",
    musicTransitionType: row.musicTransitionType ?? "",
    musicStartBehavior: row.musicStartBehavior ?? "",
    musicEndBehavior: row.musicEndBehavior ?? "",
    soundEnvironmentOverride: row.soundEnvironmentOverride ?? "",
    soundCharacterOverride: row.soundCharacterOverride ?? "",
    soundPropOverride: row.soundPropOverride ?? "",
    soundTransitionOverride: row.soundTransitionOverride ?? "",
    soundAmbientOverride: row.soundAmbientOverride ?? "",
    voicePriority: row.voicePriority ?? "",
    musicPriority: row.musicPriority ?? "",
    soundPriority: row.soundPriority ?? "",
    audioFocus: row.audioFocus ?? "",
    duckingMode: row.duckingMode ?? "",
    voiceAssetOverride: row.voiceAssetOverride ?? "",
    musicAssetOverride: row.musicAssetOverride ?? "",
    ambienceAssetOverride: row.ambienceAssetOverride ?? "",
    sfxAssetOverride: row.sfxAssetOverride ?? "",
    durationSeconds: row.durationSeconds,
    locationId: row.locationId,
    location: row.location ? mapStudioLocationToListItem(row.location) : null,
    characters: row.characters.map((link) => mapStudioCharacterToListItem(link.character)),
    props: row.props.map((link) => mapStudioPropToListItem(link.prop)),
    selectedSceneImageId: row.selectedSceneImageId,
    sceneImages: row.sceneImages.map(mapStudioSceneImageToListItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSceneSnapshot(row: SceneRow): SceneSnapshot {
  const description = row.description;
  const action = row.action;
  const noteParts = [description.trim(), action.trim()].filter(Boolean);
  return {
    sceneId: row.id,
    order: row.order,
    title: row.title,
    description,
    location: row.location ? toLocationSnapshot(row.location) : null,
    characters: row.characters.map((link) => toCharacterSnapshot(link.character)),
    props: row.props.map((link) => toPropSnapshot(link.prop)),
    action,
    emotion: row.emotion,
    camera: row.camera,
    shotType: row.shotType,
    cameraMovement: row.cameraMovement,
    sceneEnergy: normalizeStudioSceneEnergy(row.sceneEnergy),
    transitionToNext: row.transitionToNext,
    durationSeconds: row.durationSeconds,
    notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
    selectedSceneImageId: row.selectedSceneImageId,
    preferredSceneImageUrl: resolvePreferredSceneImageUrl(row),
  };
}

function resolvePreferredSceneImageUrl(row: SceneRow): string | null {
  if (row.selectedSceneImageId) {
    const selected = row.sceneImages.find(
      (img) => img.id === row.selectedSceneImageId && img.status === "completed" && img.imageUrl
    );
    if (selected?.imageUrl) {
      return selected.imageUrl;
    }
  }
  const latest = row.sceneImages.find((img) => img.status === "completed" && img.imageUrl);
  return latest?.imageUrl ?? null;
}

export function toStoryboardSnapshot(
  storyboard: Pick<
    StudioStoryboard,
    "id" | "title" | "description" | "promptStyleProfile" | "directorProfile"
  >,
  scenes: SceneRow[]
): StoryboardSnapshot {
  return {
    id: storyboard.id,
    title: storyboard.title,
    description: storyboard.description,
    promptStyleProfile: normalizeStudioPromptStyleProfile(storyboard.promptStyleProfile),
    directorProfile: normalizeStudioDirectorProfile(storyboard.directorProfile),
    scenes: scenes.map(toSceneSnapshot),
  };
}

export function mapStudioStoryboardToListItem(
  row: StudioStoryboard & { _count: { scenes: number } },
  options?: { ownerEmail?: string }
): StudioStoryboardListItem {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    promptStyleProfile: normalizeStudioPromptStyleProfile(row.promptStyleProfile),
    directorProfile: normalizeStudioDirectorProfile(row.directorProfile),
    aiDirectorPrompt: row.aiDirectorPrompt ?? "",
    aiDirectorStyleStrength: normalizeAiDirectorStyleStrength(row.aiDirectorStyleStrength),
    voiceEnabled: row.voiceEnabled ?? false,
    voiceLanguage: row.voiceLanguage ?? "en",
    voiceStyle: row.voiceStyle ?? "warm",
    voiceProfile: normalizeStudioVoiceProfileId(row.voiceProfile),
    narrationMode: normalizeStudioNarrationMode(row.narrationMode),
    voiceNarrationScript: row.voiceNarrationScript ?? "",
    musicEnabled: row.musicEnabled ?? false,
    musicStyle: row.musicStyle ?? "",
    musicIntensity: row.musicIntensity ?? "balanced",
    musicNarrativeRole: row.musicNarrativeRole ?? "support_narrative",
    musicNotes: row.musicNotes ?? "",
    soundEnabled: row.soundEnabled ?? false,
    soundStyle: row.soundStyle ?? "",
    soundDensity: row.soundDensity ?? "balanced",
    soundNotes: row.soundNotes ?? "",
    audioProductionEnabled: row.audioProductionEnabled ?? true,
    audioStyle: row.audioStyle ?? "",
    audioPriorityStrategy: row.audioPriorityStrategy ?? "balanced",
    audioNotes: row.audioNotes ?? "",
    audioAssetsEnabled: row.audioAssetsEnabled ?? true,
    audioAssetNotes: row.audioAssetNotes ?? "",
    audioAssetLinks: parseStoryboardAudioAssetLinks(row.audioAssetMetadataJson),
    autoSelectImprovedImage: row.autoSelectImprovedImage,
    sceneCount: row._count.scenes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: options?.ownerEmail,
  };
}

export function mapStudioStoryboardToDetail(
  row: StudioStoryboard & { scenes: SceneRow[] },
  options?: { ownerEmail?: string }
): StudioStoryboardDetail {
  const scenes = [...row.scenes].sort((a, b) => a.order - b.order);
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    promptStyleProfile: normalizeStudioPromptStyleProfile(row.promptStyleProfile),
    directorProfile: normalizeStudioDirectorProfile(row.directorProfile),
    aiDirectorPrompt: row.aiDirectorPrompt ?? "",
    aiDirectorStyleStrength: normalizeAiDirectorStyleStrength(row.aiDirectorStyleStrength),
    voiceEnabled: row.voiceEnabled ?? false,
    voiceLanguage: row.voiceLanguage ?? "en",
    voiceStyle: row.voiceStyle ?? voiceStyleFromProfile(normalizeStudioVoiceProfileId(row.voiceProfile)),
    voiceProfile: normalizeStudioVoiceProfileId(row.voiceProfile),
    narrationMode: normalizeStudioNarrationMode(row.narrationMode),
    voiceNarrationScript: row.voiceNarrationScript ?? "",
    musicEnabled: row.musicEnabled ?? false,
    musicStyle: row.musicStyle ?? "",
    musicIntensity: row.musicIntensity ?? "balanced",
    musicNarrativeRole: row.musicNarrativeRole ?? "support_narrative",
    musicNotes: row.musicNotes ?? "",
    soundEnabled: row.soundEnabled ?? false,
    soundStyle: row.soundStyle ?? "",
    soundDensity: row.soundDensity ?? "balanced",
    soundNotes: row.soundNotes ?? "",
    audioProductionEnabled: row.audioProductionEnabled ?? true,
    audioStyle: row.audioStyle ?? "",
    audioPriorityStrategy: row.audioPriorityStrategy ?? "balanced",
    audioNotes: row.audioNotes ?? "",
    audioAssetsEnabled: row.audioAssetsEnabled ?? true,
    audioAssetNotes: row.audioAssetNotes ?? "",
    audioAssetLinks: parseStoryboardAudioAssetLinks(row.audioAssetMetadataJson),
    autoSelectImprovedImage: row.autoSelectImprovedImage,
    sceneCount: scenes.length,
    scenes: scenes.map(mapStudioSceneToDetail),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerEmail: options?.ownerEmail,
  };
}

async function assertSceneAssetsOwned(
  ownerId: string,
  locationId: string | null,
  characterIds: string[],
  propIds: string[]
): Promise<{ ok: true } | { error: ServiceError }> {
  if (locationId) {
    const location = await prisma.studioLocation.findUnique({
      where: { id: locationId },
      select: { ownerId: true },
    });
    if (!location || location.ownerId !== ownerId) {
      return {
        error: serviceError("INVALID_LOCATION", "Location not found or not owned by you.", 400),
      };
    }
  }

  if (characterIds.length > 0) {
    const count = await prisma.studioCharacter.count({
      where: { id: { in: characterIds }, ownerId },
    });
    if (count !== characterIds.length) {
      return {
        error: serviceError(
          "INVALID_CHARACTERS",
          "One or more characters are invalid.",
          400
        ),
      };
    }
  }

  if (propIds.length > 0) {
    const count = await prisma.studioProp.count({
      where: { id: { in: propIds }, ownerId },
    });
    if (count !== propIds.length) {
      return {
        error: serviceError("INVALID_PROPS", "One or more props are invalid.", 400),
      };
    }
  }

  return { ok: true };
}

async function syncSceneRelations(
  sceneId: string,
  characterIds: string[],
  propIds: string[]
): Promise<void> {
  await prisma.$transaction([
    prisma.studioSceneCharacter.deleteMany({ where: { sceneId } }),
    prisma.studioSceneProp.deleteMany({ where: { sceneId } }),
    ...(characterIds.length > 0
      ? [
          prisma.studioSceneCharacter.createMany({
            data: characterIds.map((characterId) => ({ sceneId, characterId })),
          }),
        ]
      : []),
    ...(propIds.length > 0
      ? [
          prisma.studioSceneProp.createMany({
            data: propIds.map((propId) => ({ sceneId, propId })),
          }),
        ]
      : []),
  ]);
}

async function renumberScenes(storyboardId: string): Promise<void> {
  const scenes = await prisma.studioScene.findMany({
    where: { storyboardId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    scenes.map((scene, index) =>
      prisma.studioScene.update({
        where: { id: scene.id },
        data: { order: index },
      })
    )
  );
}

async function getStoryboardForModify(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<
  | { storyboard: StudioStoryboard }
  | { error: ServiceError }
> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
  });
  if (!storyboard) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  if (!studioStoryboardViewerCanModify(viewer, storyboard)) {
    return { error: serviceError("FORBIDDEN", "Forbidden.", 403) };
  }
  return { storyboard };
}

async function loadSceneDetail(sceneId: string): Promise<StudioSceneDetail | null> {
  const row = await prisma.studioScene.findUnique({
    where: { id: sceneId },
    include: SCENE_INCLUDE,
  });
  return row ? mapStudioSceneToDetail(row) : null;
}

export async function listStudioStoryboards(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioStoryboardListItem[]> {
  const rows = await prisma.studioStoryboard.findMany({
    where: canAccessAdmin(viewer) ? undefined : { ownerId: viewer.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { scenes: true } },
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
  });

  return rows.map((row) => {
    const ownerEmail =
      "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
        ? (row.owner as { email: string }).email
        : undefined;
    return mapStudioStoryboardToListItem(row, { ownerEmail });
  });
}

export async function getStudioStoryboardById(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StudioStoryboardDetail | null> {
  const row = await prisma.studioStoryboard.findUnique({
    where: { id },
    include: {
      scenes: { include: SCENE_INCLUDE, orderBy: { order: "asc" } },
      ...(canAccessAdmin(viewer) ? { owner: { select: { email: true } } } : {}),
    },
  });
  if (!row) {
    return null;
  }
  if (!studioStoryboardViewerCanView(viewer, row)) {
    return null;
  }
  const ownerEmail =
    "owner" in row && row.owner && typeof row.owner === "object" && "email" in row.owner
      ? (row.owner as { email: string }).email
      : undefined;
  return mapStudioStoryboardToDetail(row, { ownerEmail });
}

export async function createStudioStoryboard(
  ownerId: string,
  raw: StudioStoryboardCreateInput
): Promise<{ storyboard: StudioStoryboardDetail } | { error: ServiceError }> {
  const validated = validateStudioStoryboardCreateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  const row = await prisma.studioStoryboard.create({
    data: {
      ownerId,
      title: validated.value.title,
      description: validated.value.description,
      promptStyleProfile: validated.value.promptStyleProfile,
      directorProfile: validated.value.directorProfile,
    },
  });

  return {
    storyboard: mapStudioStoryboardToDetail({ ...row, scenes: [] }),
  };
}

export async function updateStudioStoryboard(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioStoryboardUpdateInput
): Promise<{ storyboard: StudioStoryboardDetail } | { error: ServiceError }> {
  const access = await getStoryboardForModify(id, viewer);
  if ("error" in access) {
    return access;
  }

  const validated = validateStudioStoryboardUpdateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  await prisma.studioStoryboard.update({
    where: { id },
    data: validated.value,
  });

  const detail = await getStudioStoryboardById(id, viewer);
  if (!detail) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }
  return { storyboard: detail };
}

export async function deleteStudioStoryboard(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const access = await getStoryboardForModify(id, viewer);
  if ("error" in access) {
    return access;
  }

  await prisma.studioStoryboard.delete({ where: { id } });
  return { ok: true };
}

export async function createStudioScene(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioSceneCreateInput
): Promise<{ scene: StudioSceneDetail } | { error: ServiceError }> {
  const access = await getStoryboardForModify(storyboardId, viewer);
  if ("error" in access) {
    return access;
  }

  const validated = validateStudioSceneCreateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  const assets = await assertSceneAssetsOwned(
    access.storyboard.ownerId,
    validated.value.locationId,
    validated.value.characterIds,
    validated.value.propIds
  );
  if ("error" in assets) {
    return assets;
  }

  const maxOrder = await prisma.studioScene.aggregate({
    where: { storyboardId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const scene = await prisma.studioScene.create({
    data: {
      storyboardId,
      order,
      title: validated.value.title,
      description: validated.value.description,
      action: validated.value.action,
      emotion: validated.value.emotion,
      camera: validated.value.camera,
      shotType: validated.value.shotType,
      cameraMovement: validated.value.cameraMovement,
      sceneEnergy: validated.value.sceneEnergy,
      transitionToNext: validated.value.transitionToNext,
      durationSeconds: validated.value.durationSeconds,
      locationId: validated.value.locationId,
    },
  });

  await syncSceneRelations(
    scene.id,
    validated.value.characterIds,
    validated.value.propIds
  );

  const detail = await loadSceneDetail(scene.id);
  return { scene: detail! };
}

export async function updateStudioScene(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  raw: StudioSceneUpdateInput
): Promise<{ scene: StudioSceneDetail } | { error: ServiceError }> {
  const access = await getStoryboardForModify(storyboardId, viewer);
  if ("error" in access) {
    return access;
  }

  const existing = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: {
      characters: { select: { characterId: true } },
      props: { select: { propId: true } },
    },
  });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }

  const validated = validateStudioSceneUpdateInput(raw);
  if (!validated.ok) {
    return { error: serviceError(validated.code, validated.message, 400) };
  }

  const patch = validated.value;
  const locationId =
    patch.locationId !== undefined ? patch.locationId : existing.locationId;
  const characterIds =
    patch.characterIds !== undefined
      ? patch.characterIds
      : existing.characters.map((c) => c.characterId);
  const propIds =
    patch.propIds !== undefined ? patch.propIds : existing.props.map((p) => p.propId);

  const assets = await assertSceneAssetsOwned(
    access.storyboard.ownerId,
    locationId,
    characterIds,
    propIds
  );
  if ("error" in assets) {
    return assets;
  }

  const { characterIds: _c, propIds: _p, ...sceneData } = patch;
  await prisma.studioScene.update({
    where: { id: sceneId },
    data: sceneData,
  });

  if (patch.characterIds !== undefined || patch.propIds !== undefined) {
    await syncSceneRelations(sceneId, characterIds, propIds);
  }

  const detail = await loadSceneDetail(sceneId);
  return { scene: detail! };
}

export async function deleteStudioScene(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ ok: true } | { error: ServiceError }> {
  const access = await getStoryboardForModify(storyboardId, viewer);
  if ("error" in access) {
    return access;
  }

  const existing = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    select: { id: true },
  });
  if (!existing) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }

  await prisma.studioScene.delete({ where: { id: sceneId } });
  await renumberScenes(storyboardId);
  return { ok: true };
}

export async function duplicateStudioScene(
  storyboardId: string,
  sceneId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ scene: StudioSceneDetail } | { error: ServiceError }> {
  const access = await getStoryboardForModify(storyboardId, viewer);
  if ("error" in access) {
    return access;
  }

  const source = await prisma.studioScene.findFirst({
    where: { id: sceneId, storyboardId },
    include: SCENE_INCLUDE,
  });
  if (!source) {
    return { error: serviceError("NOT_FOUND", "Scene not found.", 404) };
  }

  const insertOrder = source.order + 1;

  const created = await prisma.$transaction(async (tx) => {
    await tx.studioScene.updateMany({
      where: { storyboardId, order: { gte: insertOrder } },
      data: { order: { increment: 1 } },
    });
    return tx.studioScene.create({
      data: {
        storyboardId,
        order: insertOrder,
        title: source.title ? `${source.title} (copy)` : "Scene (copy)",
        description: source.description,
        action: source.action,
        emotion: source.emotion,
        camera: source.camera,
        shotType: source.shotType,
        cameraMovement: source.cameraMovement,
        sceneEnergy: source.sceneEnergy,
        transitionToNext: source.transitionToNext,
        durationSeconds: source.durationSeconds,
        locationId: source.locationId,
        characters: {
          create: source.characters.map((link) => ({
            characterId: link.characterId,
          })),
        },
        props: {
          create: source.props.map((link) => ({
            propId: link.propId,
          })),
        },
      },
      include: SCENE_INCLUDE,
    });
  });

  return { scene: mapStudioSceneToDetail(created) };
}

export async function reorderStudioScenes(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  sceneIds: string[]
): Promise<{ ok: true } | { error: ServiceError }> {
  const access = await getStoryboardForModify(storyboardId, viewer);
  if ("error" in access) {
    return access;
  }

  const existing = await prisma.studioScene.findMany({
    where: { storyboardId },
    select: { id: true },
    orderBy: { order: "asc" },
  });

  if (sceneIds.length !== existing.length) {
    return {
      error: serviceError("INVALID_ORDER", "Scene order payload is incomplete.", 400),
    };
  }

  const existingIds = new Set(existing.map((s) => s.id));
  for (const id of sceneIds) {
    if (!existingIds.has(id)) {
      return {
        error: serviceError("INVALID_ORDER", "Scene order contains unknown ids.", 400),
      };
    }
  }

  await prisma.$transaction(
    sceneIds.map((id, order) =>
      prisma.studioScene.update({
        where: { id },
        data: { order },
      })
    )
  );

  return { ok: true };
}

export async function getStoryboardSnapshotById(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<StoryboardSnapshot | null> {
  const row = await prisma.studioStoryboard.findUnique({
    where: { id },
    include: {
      scenes: { include: SCENE_INCLUDE, orderBy: { order: "asc" } },
    },
  });
  if (!row || !studioStoryboardViewerCanView(viewer, row)) {
    return null;
  }
  return toStoryboardSnapshot(row, row.scenes);
}

/** Loads storyboard scenes with images for Motion handoff v3. */
export async function getStoryboardSceneRowsForHandoff(
  id: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<
  | {
      storyboard: Pick<
        StudioStoryboard,
        | "id"
        | "title"
        | "description"
        | "promptStyleProfile"
        | "directorProfile"
        | "aiDirectorPrompt"
      >;
      scenes: SceneRow[];
    }
  | null
> {
  const row = await prisma.studioStoryboard.findUnique({
    where: { id },
    include: {
      scenes: { include: SCENE_INCLUDE, orderBy: { order: "asc" } },
    },
  });
  if (!row || !studioStoryboardViewerCanView(viewer, row)) {
    return null;
  }
  return {
    storyboard: {
      id: row.id,
      title: row.title,
      description: row.description,
      promptStyleProfile: normalizeStudioPromptStyleProfile(row.promptStyleProfile),
      directorProfile: normalizeStudioDirectorProfile(row.directorProfile),
      aiDirectorPrompt: row.aiDirectorPrompt ?? "",
    },
    scenes: row.scenes,
  };
}
