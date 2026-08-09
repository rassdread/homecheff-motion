/**
 * S.6E — ContinuityBundle runtime contract.
 * Continuity owns identity; Matrix consumes this payload and must not invent entities.
 */

import type { PromptBuilderSourceEntities } from "@/lib/studio-identity-prompt-context";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  SceneMemoryBundle,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";
import type { PromptBuilderInput } from "@/types/studio-prompt-builder";

export type ContinuityReferenceDescriptor = {
  role: string;
  url: string;
  entityId: string | null;
  entityKind: "character" | "location" | "prop" | "world" | "source_image" | "brand" | "other";
};

export type ContinuityVoiceIdentity = {
  characterId: string | null;
  voiceProvider: string | null;
  voiceProfileId: string | null;
  language: string | null;
  locked: boolean;
};

export type ContinuityBrandIdentity = {
  brandKitId: string;
  name: string | null;
  /** Storage-only fields until BrandKit is generation-wired. */
  fields: Record<string, string | null>;
  available: boolean;
};

export type ContinuityStoryboardContext = {
  storyboardId: string | null;
  title: string | null;
};

export type ContinuitySceneContext = {
  sceneId: string | null;
  title: string | null;
  description: string | null;
  action: string | null;
  emotion: string | null;
  camera: string | null;
  shotType: string | null;
  cameraMovement: string | null;
  sceneEnergy: string | null;
  durationSeconds: number | null;
};

export type ContinuityDirectorContext = {
  directorProfile: string | null;
  styleProfile: string | null;
};

export type ContinuityStyleContext = {
  styleProfile: string | null;
  worldVisualStyle: string | null;
};

export type ContinuityCase =
  | "entity_aware_studio"
  | "standalone_source_image"
  | "fusion_refs"
  | "none";

export type ContinuityBundle = {
  world: WorldMemorySnapshot | null;
  characters: CharacterMemorySnapshot[];
  location: LocationMemorySnapshot | null;
  props: PropMemorySnapshot[];
  brand: ContinuityBrandIdentity | null;
  storyboard: ContinuityStoryboardContext;
  scene: ContinuitySceneContext;
  director: ContinuityDirectorContext;
  camera: {
    shotType: string | null;
    cameraMovement: string | null;
    sceneEnergy: string | null;
    camera: string | null;
  };
  voice: ContinuityVoiceIdentity[];
  style: ContinuityStyleContext;
  references: ContinuityReferenceDescriptor[];
  memoryBundle: SceneMemoryBundle | null;
  sourceEntities: PromptBuilderSourceEntities | null;
  continuityMeta: {
    continuityStrength: StudioContinuityStrength | null;
    continuityCase: ContinuityCase;
    identityRules: string[];
  };
};

export function emptyContinuityBundle(partial?: Partial<ContinuityBundle>): ContinuityBundle {
  return {
    world: null,
    characters: [],
    location: null,
    props: [],
    brand: null,
    storyboard: { storyboardId: null, title: null },
    scene: {
      sceneId: null,
      title: null,
      description: null,
      action: null,
      emotion: null,
      camera: null,
      shotType: null,
      cameraMovement: null,
      sceneEnergy: null,
      durationSeconds: null,
    },
    director: { directorProfile: null, styleProfile: null },
    camera: {
      shotType: null,
      cameraMovement: null,
      sceneEnergy: null,
      camera: null,
    },
    voice: [],
    style: { styleProfile: null, worldVisualStyle: null },
    references: [],
    memoryBundle: null,
    sourceEntities: null,
    continuityMeta: {
      continuityStrength: null,
      continuityCase: "none",
      identityRules: [],
    },
    ...partial,
  };
}

function collectReferencesFromMemory(bundle: SceneMemoryBundle | null): ContinuityReferenceDescriptor[] {
  if (!bundle) return [];
  const refs: ContinuityReferenceDescriptor[] = [];
  for (const c of bundle.characters) {
    if (c.referenceImageUrl) {
      refs.push({
        role: "character_reference",
        url: c.referenceImageUrl,
        entityId: c.id,
        entityKind: "character",
      });
    }
  }
  if (bundle.location?.referenceImageUrl) {
    refs.push({
      role: "location_reference",
      url: bundle.location.referenceImageUrl,
      entityId: bundle.location.id,
      entityKind: "location",
    });
  }
  for (const p of bundle.props) {
    if (p.referenceImageUrl) {
      refs.push({
        role: "prop_reference",
        url: p.referenceImageUrl,
        entityId: p.id,
        entityKind: "prop",
      });
    }
  }
  return refs;
}

/** Resolve ContinuityBundle from existing prompt-builder input (no DB redesign). */
export function resolveContinuityBundleFromPromptInput(
  input: PromptBuilderInput,
  options?: {
    storyboardId?: string | null;
    storyboardTitle?: string | null;
    durationSeconds?: number | null;
    brand?: ContinuityBrandIdentity | null;
    voice?: ContinuityVoiceIdentity[];
    sourceImageUrl?: string | null;
    continuityCase?: ContinuityCase;
  }
): ContinuityBundle {
  const memory = input.memoryBundle ?? null;
  const characters = memory?.characters ?? [];
  const location = memory?.location ?? null;
  const props = memory?.props ?? [];
  const world = memory?.world ?? null;

  const hasEntities =
    characters.length > 0 || Boolean(location) || props.length > 0 || Boolean(world);
  const continuityCase =
    options?.continuityCase ??
    (hasEntities
      ? "entity_aware_studio"
      : options?.sourceImageUrl
        ? "standalone_source_image"
        : "none");

  const references = collectReferencesFromMemory(memory);
  if (options?.sourceImageUrl) {
    references.push({
      role: "source_image",
      url: options.sourceImageUrl,
      entityId: null,
      entityKind: "source_image",
    });
  }

  const identityRules: string[] = [];
  if (characters.length > 0) identityRules.push("character_identity_required");
  if (location) identityRules.push("location_identity_required");
  if (props.length > 0) identityRules.push("prop_identity_required");
  if (world) identityRules.push("world_continuity_required");

  return emptyContinuityBundle({
    world,
    characters,
    location,
    props,
    brand: options?.brand ?? null,
    storyboard: {
      storyboardId: options?.storyboardId ?? null,
      title: options?.storyboardTitle ?? null,
    },
    scene: {
      sceneId: input.scene.sceneId,
      title: input.scene.title ?? null,
      description: input.scene.description ?? null,
      action: input.scene.action ?? null,
      emotion: input.scene.emotion ?? null,
      camera: input.scene.camera ?? null,
      shotType: input.shotType ?? null,
      cameraMovement: input.cameraMovement ?? null,
      sceneEnergy: input.sceneEnergy ?? null,
      durationSeconds: options?.durationSeconds ?? null,
    },
    director: {
      directorProfile: input.directorProfile ?? null,
      styleProfile: input.styleProfile ?? null,
    },
    camera: {
      shotType: input.shotType ?? null,
      cameraMovement: input.cameraMovement ?? null,
      sceneEnergy: input.sceneEnergy ?? null,
      camera: input.scene.camera ?? null,
    },
    voice: options?.voice ?? [],
    style: {
      styleProfile: input.styleProfile ?? null,
      worldVisualStyle: world?.visualStyle ?? null,
    },
    references,
    memoryBundle: memory,
    sourceEntities: input.sourceEntities ?? null,
    continuityMeta: {
      continuityStrength: memory?.continuityStrength ?? null,
      continuityCase,
      identityRules,
    },
  });
}

/** Resolve ContinuityBundle for standalone Instant photo→video (source image is continuity). */
export function resolveStandaloneSourceContinuityBundle(input: {
  sourceImageUrl: string;
  durationSeconds?: number | null;
  aspectHint?: string | null;
}): ContinuityBundle {
  return emptyContinuityBundle({
    references: [
      {
        role: "source_image",
        url: input.sourceImageUrl,
        entityId: null,
        entityKind: "source_image",
      },
    ],
    scene: {
      sceneId: null,
      title: null,
      description: null,
      action: null,
      emotion: null,
      camera: null,
      shotType: null,
      cameraMovement: null,
      sceneEnergy: null,
      durationSeconds: input.durationSeconds ?? null,
    },
    continuityMeta: {
      continuityStrength: null,
      continuityCase: "standalone_source_image",
      identityRules: ["source_image_continuity"],
    },
  });
}

export type ContinuityModulePresence = {
  character: boolean;
  location: boolean;
  props: boolean;
  world: boolean;
  brand: boolean;
  voice: boolean;
  style: boolean;
  references: boolean;
  memoryBundle: boolean;
  sourceEntities: boolean;
};

export function inspectContinuityModulePresence(bundle: ContinuityBundle): ContinuityModulePresence {
  return {
    character: bundle.characters.length > 0,
    location: Boolean(bundle.location),
    props: bundle.props.length > 0,
    world: Boolean(bundle.world),
    brand: Boolean(bundle.brand?.available),
    voice: bundle.voice.length > 0,
    style: Boolean(bundle.style.styleProfile || bundle.style.worldVisualStyle),
    references: bundle.references.length > 0,
    memoryBundle: Boolean(bundle.memoryBundle),
    sourceEntities: Boolean(bundle.sourceEntities),
  };
}

/** Mandatory modules when entities are linked — Matrix must include them. */
export function requiredContinuityModules(bundle: ContinuityBundle): Array<keyof ContinuityModulePresence> {
  const required: Array<keyof ContinuityModulePresence> = [];
  if (bundle.characters.length > 0) required.push("character");
  if (bundle.location) required.push("location");
  if (bundle.props.length > 0) required.push("props");
  if (bundle.world) required.push("world");
  if (bundle.continuityMeta.continuityCase === "standalone_source_image") required.push("references");
  return required;
}

export function assertMandatoryContinuityPresent(bundle: ContinuityBundle): {
  ok: boolean;
  missing: Array<keyof ContinuityModulePresence>;
} {
  const presence = inspectContinuityModulePresence(bundle);
  const missing = requiredContinuityModules(bundle).filter((key) => !presence[key]);
  return { ok: missing.length === 0, missing };
}
