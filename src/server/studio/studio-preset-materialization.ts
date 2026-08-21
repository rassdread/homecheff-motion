/**
 * S2C — Server facade: materializePresetIntoStudioProject
 * Uses existing create services. No schema migration. 0 provider / 0 credit.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createStudioCharacter } from "@/server/studio/studio-character-service";
import { createStudioLocation } from "@/server/studio/studio-location-service";
import { createStudioProp } from "@/server/studio/studio-prop-service";
import {
  createStudioScene,
  createStudioStoryboard,
  getStudioStoryboardById,
} from "@/server/studio/studio-storyboard-service";
import {
  materializePresetIntoStudioProjectWithAdapters,
  type MaterializePresetResult,
} from "@/lib/studio-preset-materialization-execute";
import {
  materializationRecordFromResult,
  readS2cMetadataFromAudioAssetJson,
  type S2cStoryboardMetadata,
} from "@/lib/studio-preset-materialization-plan";
import type { StudioPresetProductionContext } from "@/types/studio-preset-production-context";
import type { StudioPresetMaterializationRecord } from "@/types/studio-preset-production-context";
import type { SessionUser } from "@/server/auth/session";

function safeTrace(event: Record<string, unknown>): void {
  try {
    console.info("[studio-preset-materialization]", JSON.stringify(event));
  } catch {
    // never throw from analytics
  }
}

export async function materializePresetIntoStudioProject(
  ownerId: string,
  context: StudioPresetProductionContext,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<MaterializePresetResult> {
  return materializePresetIntoStudioProjectWithAdapters(ownerId, context, {
    findByIdempotencyKey: async (oid, key) => {
      const rows = await prisma.studioStoryboard.findMany({
        where: { ownerId: oid },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: { id: true, audioAssetMetadataJson: true },
      });
      for (const row of rows) {
        const meta = readS2cMetadataFromAudioAssetJson(row.audioAssetMetadataJson);
        if (meta?.idempotencyKey === key) {
          const bag = row.audioAssetMetadataJson as
            | { materializationRecord?: StudioPresetMaterializationRecord }
            | null;
          const record =
            bag?.materializationRecord ??
            materializationRecordFromResult({
              context,
              storyboardId: row.id,
              characterIds: [],
              locationIds: [],
              propIds: [],
              sceneIds: [],
              resultAssetIds: [
                ...(meta.resultStillPointers ?? []),
                ...(meta.resultVideoPointers ?? []),
              ],
              upcReady: true,
            });
          return { storyboardId: row.id, record, metadata: meta as S2cStoryboardMetadata };
        }
      }
      return null;
    },
    createStoryboard: async (input) => {
      const result = await createStudioStoryboard(input.ownerId, {
        title: input.title,
        description: input.description,
        promptStyleProfile: input.promptStyleProfile,
        directorProfile: input.directorProfile,
        aiDirectorPrompt: input.aiDirectorPrompt,
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      return { id: result.storyboard.id };
    },
    patchStoryboardMeta: async (input) => {
      await prisma.studioStoryboard.update({
        where: { id: input.storyboardId },
        data: {
          musicEnabled: input.musicEnabled,
          musicNotes: input.musicNotes,
          soundEnabled: input.soundEnabled,
          soundNotes: input.soundNotes,
          audioAssetMetadataJson: input.audioAssetMetadataJson as Prisma.InputJsonValue,
        },
      });
    },
    createCharacter: async (input) => {
      const result = await createStudioCharacter(input.ownerId, {
        name: input.name,
        role: input.role,
        referenceImageUrl: input.referenceImageUrl,
        referenceStorageKey: input.referenceStorageKey,
        description: input.description,
        defaultClothing: input.defaultClothing,
        identityStrength: input.identityStrength,
        referenceNotes: input.referenceNotes,
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      return { id: result.character.id };
    },
    createLocation: async (input) => {
      const result = await createStudioLocation(input.ownerId, {
        name: input.name,
        category: input.category,
        referenceImageUrl: input.referenceImageUrl,
        referenceStorageKey: input.referenceStorageKey,
        description: input.description,
        visualIdentity: input.visualIdentity,
        environmentKeywords: input.environmentKeywords,
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      return { id: result.location.id };
    },
    createProp: async (input) => {
      const result = await createStudioProp(input.ownerId, {
        name: input.name,
        category: input.category,
        referenceImageUrl: input.referenceImageUrl,
        referenceStorageKey: input.referenceStorageKey,
        description: input.description,
        brandingRules: input.brandingRules,
        appearanceMemory: input.appearanceMemory,
        continuityStrength: input.continuityStrength,
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      return { id: result.prop.id };
    },
    createScene: async (input) => {
      const result = await createStudioScene(input.storyboardId, viewer, {
        title: input.title,
        action: input.action,
        camera: input.camera,
        emotion: input.emotion,
        durationSeconds: input.durationSeconds,
        transitionToNext: input.transitionToNext,
        locationId: input.locationId,
        characterIds: input.characterIds,
        propIds: input.propIds,
      });
      if ("error" in result) {
        throw new Error(result.error.message);
      }
      return { id: result.scene.id };
    },
    trace: safeTrace,
  });
}

export async function loadMaterializedStoryboardForUpc(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
) {
  return getStudioStoryboardById(storyboardId, viewer);
}
