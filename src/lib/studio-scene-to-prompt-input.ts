import {
  DEFAULT_STUDIO_PROMPT_STYLE_PROFILE,
  normalizeStudioPromptStyleProfile,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import { buildSceneMemoryBundle } from "@/lib/studio-memory-mappers";
import type { PromptBuilderInput } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneDetail } from "@/types/studio-api";

function characterToSnapshot(
  c: StudioSceneDetail["characters"][number]
): CharacterSnapshot {
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    description: c.description,
    personality: c.personality,
    referenceImageUrl: c.referenceImageUrl,
  };
}

function locationToSnapshot(
  loc: NonNullable<StudioSceneDetail["location"]>
): LocationSnapshot {
  return {
    id: loc.id,
    name: loc.name,
    category: loc.category,
    description: loc.description,
    referenceImageUrl: loc.referenceImageUrl,
  };
}

function propToSnapshot(p: StudioSceneDetail["props"][number]): PropSnapshot {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    referenceImageUrl: p.referenceImageUrl,
  };
}

export function studioSceneDetailToSnapshot(scene: StudioSceneDetail): SceneSnapshot {
  const noteParts = [scene.description.trim(), scene.action.trim()].filter(Boolean);
  return {
    sceneId: scene.id,
    order: scene.order,
    title: scene.title,
    description: scene.description,
    location: scene.location ? locationToSnapshot(scene.location) : null,
    characters: scene.characters.map(characterToSnapshot),
    props: scene.props.map(propToSnapshot),
    action: scene.action,
    emotion: scene.emotion,
    camera: scene.camera,
    transitionToNext: scene.transitionToNext,
    durationSeconds: scene.durationSeconds,
    notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
  };
}

function sceneDetailToMemoryBundle(scene: StudioSceneDetail) {
  return buildSceneMemoryBundle({
    characters: scene.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      description: c.description,
      personality: c.personality,
      referenceImageUrl: c.referenceImageUrl,
      appearanceMemory: c.appearanceMemory,
      personalityMemory: c.personalityMemory,
      continuityNotes: c.continuityNotes,
      defaultClothing: c.defaultClothing,
      defaultAccessories: c.defaultAccessories,
      visualKeywords: c.visualKeywords,
      primaryReferenceImageId: c.primaryReferenceImageId,
      referenceNotes: c.referenceNotes,
      identityStrength: c.identityStrength,
      continuityStrength: c.continuityStrength,
      worldProfileId: c.worldProfileId,
      worldProfile: c.worldProfile
        ? {
            id: c.worldProfile.id,
            name: c.worldProfile.name,
            description: "",
            visualStyle: "",
            tone: "",
            continuityRules: "",
            continuityStrength: "strong",
          }
        : null,
    })),
    location: scene.location
      ? {
          id: scene.location.id,
          name: scene.location.name,
          category: scene.location.category,
          description: scene.location.description,
          referenceImageUrl: scene.location.referenceImageUrl,
          worldMemory: scene.location.worldMemory,
          visualIdentity: scene.location.visualIdentity,
          environmentKeywords: scene.location.environmentKeywords,
          continuityNotes: scene.location.continuityNotes,
          continuityStrength: scene.location.continuityStrength,
          worldProfileId: scene.location.worldProfileId,
          worldProfile: scene.location.worldProfile
            ? {
                id: scene.location.worldProfile.id,
                name: scene.location.worldProfile.name,
                description: "",
                visualStyle: "",
                tone: "",
                continuityRules: "",
                continuityStrength: "strong",
              }
            : null,
        }
      : null,
    props: scene.props.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      referenceImageUrl: p.referenceImageUrl,
      appearanceMemory: p.appearanceMemory,
      brandingRules: p.brandingRules,
      continuityNotes: p.continuityNotes,
      continuityStrength: p.continuityStrength,
      worldProfileId: p.worldProfileId,
      worldProfile: p.worldProfile
        ? {
            id: p.worldProfile.id,
            name: p.worldProfile.name,
            description: "",
            visualStyle: "",
            tone: "",
            continuityRules: "",
            continuityStrength: "strong",
          }
        : null,
    })),
  });
}

export function studioSceneDetailToPromptInput(
  scene: StudioSceneDetail,
  styleProfile?: StudioPromptStyleProfile | string
): PromptBuilderInput {
  const snap = studioSceneDetailToSnapshot(scene);
  const input = sceneSnapshotToPromptInput(snap, styleProfile);
  return { ...input, memoryBundle: sceneDetailToMemoryBundle(scene) };
}

export function sceneSnapshotToPromptInput(
  scene: SceneSnapshot,
  styleProfile?: StudioPromptStyleProfile | string
): PromptBuilderInput {
  return {
    scene: {
      sceneId: scene.sceneId,
      title: scene.title,
      description: scene.description,
      action: scene.action,
      emotion: scene.emotion,
      camera: scene.camera,
    },
    location: scene.location,
    characters: scene.characters,
    props: scene.props,
    styleProfile: styleProfile
      ? normalizeStudioPromptStyleProfile(styleProfile)
      : DEFAULT_STUDIO_PROMPT_STYLE_PROFILE,
  };
}
