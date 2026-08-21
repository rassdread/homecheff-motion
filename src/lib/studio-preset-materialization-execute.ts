/**
 * S2C — Execute materialization plan via injectable adapters (0 providers / 0 credits).
 */

import {
  materializationRecordFromResult,
  planPresetMaterialization,
  wrapAudioAssetMetadataWithS2c,
  type PresetMaterializationPlan,
  type S2cStoryboardMetadata,
} from "@/lib/studio-preset-materialization-plan";
import { studioWorkspaceHrefForStoryboard } from "@/lib/studio-preset-production-context";
import type {
  StudioPresetMaterializationRecord,
  StudioPresetProductionContext,
} from "@/types/studio-preset-production-context";

export type MaterializationAdapters = {
  findByIdempotencyKey: (
    ownerId: string,
    idempotencyKey: string
  ) => Promise<{
    storyboardId: string;
    record: StudioPresetMaterializationRecord;
    metadata: S2cStoryboardMetadata;
  } | null>;
  createStoryboard: (input: {
    ownerId: string;
    title: string;
    description: string;
    promptStyleProfile: string;
    directorProfile: string;
    aiDirectorPrompt: string;
  }) => Promise<{ id: string }>;
  patchStoryboardMeta: (input: {
    storyboardId: string;
    musicEnabled: boolean;
    musicNotes: string;
    soundEnabled: boolean;
    soundNotes: string;
    audioAssetMetadataJson: Record<string, unknown>;
  }) => Promise<void>;
  createCharacter: (input: {
    ownerId: string;
    name: string;
    role: "human";
    referenceImageUrl: string;
    referenceStorageKey: string;
    description: string;
    defaultClothing: string;
    identityStrength: string;
    referenceNotes: string;
  }) => Promise<{ id: string }>;
  createLocation: (input: {
    ownerId: string;
    name: string;
    category: string;
    referenceImageUrl: string;
    referenceStorageKey: string;
    description: string;
    visualIdentity: string;
    environmentKeywords: string;
  }) => Promise<{ id: string }>;
  createProp: (input: {
    ownerId: string;
    name: string;
    category: string;
    referenceImageUrl: string;
    referenceStorageKey: string;
    description: string;
    brandingRules: string;
    appearanceMemory: string;
    continuityStrength: string;
  }) => Promise<{ id: string }>;
  createScene: (input: {
    storyboardId: string;
    title: string;
    action: string;
    camera: string;
    emotion: string;
    durationSeconds: number;
    transitionToNext: string;
    locationId: string | null;
    characterIds: string[];
    propIds: string[];
  }) => Promise<{ id: string }>;
  trace?: (event: Record<string, unknown>) => void;
};

export type MaterializePresetResult =
  | {
      ok: true;
      reused: boolean;
      storyboardId: string;
      workspaceHref: string;
      record: StudioPresetMaterializationRecord;
      plan: PresetMaterializationPlan;
      providerCalls: 0;
      creditsDebited: 0;
      durationMs: number;
    }
  | {
      ok: false;
      code: string;
      message: string;
      plan: PresetMaterializationPlan;
      providerCalls: 0;
      creditsDebited: 0;
      durationMs: number;
    };

export async function materializePresetIntoStudioProjectWithAdapters(
  ownerId: string,
  context: StudioPresetProductionContext,
  adapters: MaterializationAdapters
): Promise<MaterializePresetResult> {
  const started = Date.now();
  const plan = planPresetMaterialization(context);

  if (plan.status !== "READY") {
    const code =
      plan.status === "MISSING_INPUT"
        ? "MATERIALIZATION_MISSING_INPUT"
        : plan.status === "SKIPPED_ONE_SHOT"
          ? "SKIPPED_ONE_SHOT"
          : plan.status === "BLOCKED"
            ? "BLOCKED"
            : "UNSUPPORTED";
    adapters.trace?.({
      event: "studio-preset-materialization",
      sourceType: context.origin.sourceType,
      sourceId: context.origin.sourceId,
      lifecycleClass: context.lifecycleClass,
      materializationMode: context.materializationMode,
      status: code,
      providerCalls: 0,
      durationMs: Date.now() - started,
    });
    return {
      ok: false,
      code,
      message: plan.reason,
      plan,
      providerCalls: 0,
      creditsDebited: 0,
      durationMs: Date.now() - started,
    };
  }

  const existing = await adapters.findByIdempotencyKey(ownerId, context.idempotencyKey);
  if (existing) {
    adapters.trace?.({
      event: "studio-preset-materialization",
      sourceType: context.origin.sourceType,
      sourceId: context.origin.sourceId,
      lifecycleClass: context.lifecycleClass,
      materializationMode: context.materializationMode,
      projectId: existing.storyboardId,
      status: "REUSED",
      providerCalls: 0,
      durationMs: Date.now() - started,
    });
    return {
      ok: true,
      reused: true,
      storyboardId: existing.storyboardId,
      workspaceHref: studioWorkspaceHrefForStoryboard(existing.storyboardId),
      record: existing.record,
      plan,
      providerCalls: 0,
      creditsDebited: 0,
      durationMs: Date.now() - started,
    };
  }

  const storyboard = await adapters.createStoryboard({
    ownerId,
    title: plan.title,
    description: plan.description,
    promptStyleProfile: plan.promptStyleProfile,
    directorProfile: plan.directorProfile,
    aiDirectorPrompt: plan.aiDirectorPrompt,
  });

  const characterIdByKey = new Map<string, string>();
  for (const character of plan.characters) {
    const created = await adapters.createCharacter({
      ownerId,
      name: character.name,
      role: character.role,
      referenceImageUrl: character.referenceImageUrl,
      referenceStorageKey: character.referenceStorageKey,
      description: character.description,
      defaultClothing: character.defaultClothing,
      identityStrength: character.identityStrength,
      referenceNotes: character.referenceNotes,
    });
    characterIdByKey.set(character.sourceKey, created.id);
  }

  const locationIdByKey = new Map<string, string>();
  for (const location of plan.locations) {
    const created = await adapters.createLocation({
      ownerId,
      name: location.name,
      category: location.category,
      referenceImageUrl: location.referenceImageUrl,
      referenceStorageKey: location.referenceStorageKey,
      description: location.description,
      visualIdentity: location.visualIdentity,
      environmentKeywords: location.environmentKeywords,
    });
    locationIdByKey.set(location.sourceKey, created.id);
  }

  const propIdByKey = new Map<string, string>();
  for (const prop of plan.props) {
    const created = await adapters.createProp({
      ownerId,
      name: prop.name,
      category: prop.category,
      referenceImageUrl: prop.referenceImageUrl,
      referenceStorageKey: prop.referenceStorageKey,
      description: prop.description,
      brandingRules: prop.brandingRules,
      appearanceMemory: prop.appearanceMemory,
      continuityStrength: prop.continuityStrength,
    });
    propIdByKey.set(prop.sourceKey, created.id);
  }

  const sceneIds: string[] = [];
  for (const scene of plan.scenes) {
    const created = await adapters.createScene({
      storyboardId: storyboard.id,
      title: scene.title,
      action: scene.action,
      camera: scene.camera,
      emotion: scene.emotion,
      durationSeconds: scene.durationSeconds,
      transitionToNext: scene.transitionToNext,
      locationId: scene.locationSourceKey
        ? locationIdByKey.get(scene.locationSourceKey) ?? null
        : null,
      characterIds: scene.characterSourceKeys
        .map((k) => characterIdByKey.get(k))
        .filter((id): id is string => Boolean(id)),
      propIds: scene.propSourceKeys
        .map((k) => propIdByKey.get(k))
        .filter((id): id is string => Boolean(id)),
    });
    sceneIds.push(created.id);
  }

  const record = materializationRecordFromResult({
    context,
    storyboardId: storyboard.id,
    characterIds: [...characterIdByKey.values()],
    locationIds: [...locationIdByKey.values()],
    propIds: [...propIdByKey.values()],
    sceneIds,
    resultAssetIds: [
      ...plan.metadata.resultStillPointers,
      ...plan.metadata.resultVideoPointers,
    ],
    upcReady: true,
  });

  await adapters.patchStoryboardMeta({
    storyboardId: storyboard.id,
    musicEnabled: plan.musicEnabled,
    musicNotes: plan.musicNotes,
    soundEnabled: plan.soundEnabled,
    soundNotes: plan.soundNotes,
    audioAssetMetadataJson: wrapAudioAssetMetadataWithS2c(
      { materializationRecord: record },
      plan.metadata
    ),
  });

  const durationMs = Date.now() - started;
  adapters.trace?.({
    event: "studio-preset-materialization",
    sourceType: context.origin.sourceType,
    sourceId: context.origin.sourceId,
    lifecycleClass: context.lifecycleClass,
    materializationMode: context.materializationMode,
    projectId: storyboard.id,
    entityCounts: {
      characters: characterIdByKey.size,
      locations: locationIdByKey.size,
      props: propIdByKey.size,
    },
    sceneCount: sceneIds.length,
    resultAssetsReused: record.resultAssetIds.length,
    providerCalls: 0,
    durationMs,
    status: "CREATED",
  });

  return {
    ok: true,
    reused: false,
    storyboardId: storyboard.id,
    workspaceHref: studioWorkspaceHrefForStoryboard(storyboard.id),
    record,
    plan,
    providerCalls: 0,
    creditsDebited: 0,
    durationMs,
  };
}

/** In-memory adapters for unit tests — proves idempotency + zero provider calls. */
export function createInMemoryMaterializationAdapters(): {
  adapters: MaterializationAdapters;
  store: {
    storyboards: Map<string, Record<string, unknown>>;
    byIdempotency: Map<string, string>;
  };
} {
  const storyboards = new Map<string, Record<string, unknown>>();
  const byIdempotency = new Map<string, string>();
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${++seq}`;

  const adapters: MaterializationAdapters = {
    findByIdempotencyKey: async (ownerId, key) => {
      const id = byIdempotency.get(`${ownerId}:${key}`);
      if (!id) return null;
      const row = storyboards.get(id);
      if (!row) return null;
      return {
        storyboardId: id,
        record: row.record as StudioPresetMaterializationRecord,
        metadata: row.metadata as S2cStoryboardMetadata,
      };
    },
    createStoryboard: async (input) => {
      const id = nextId("sb");
      storyboards.set(id, {
        ...input,
        id,
        ownerId: input.ownerId,
        characters: [],
        locations: [],
        props: [],
        scenes: [],
      });
      return { id };
    },
    patchStoryboardMeta: async (input) => {
      const row = storyboards.get(input.storyboardId);
      if (!row) return;
      Object.assign(row, input);
      const meta = input.audioAssetMetadataJson?.s2c as S2cStoryboardMetadata | undefined;
      const record = (input.audioAssetMetadataJson as { materializationRecord?: StudioPresetMaterializationRecord })
        ?.materializationRecord;
      if (meta?.idempotencyKey && record) {
        row.metadata = meta;
        row.record = record;
        byIdempotency.set(`${row.ownerId}:${meta.idempotencyKey}`, input.storyboardId);
      }
    },
    createCharacter: async () => {
      const id = nextId("char");
      return { id };
    },
    createLocation: async () => ({ id: nextId("loc") }),
    createProp: async () => ({ id: nextId("prop") }),
    createScene: async () => ({ id: nextId("scene") }),
  };

  return { adapters, store: { storyboards, byIdempotency } };
}
