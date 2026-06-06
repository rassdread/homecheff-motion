/**
 * Studio V2 — render readiness projection for AI Director proposals.
 */

import { resolveProposedSceneText, type ProposalTextResolver } from "@/lib/studio-director-proposal-apply";
import {
  buildStudioUnifiedReadiness,
  unifiedToProposalRenderReadiness,
} from "@/lib/studio-unified-readiness";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  DirectorProposalRenderReadiness,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";

export function buildProposalAppliedStoryboard(
  base: StudioStoryboardDetail,
  proposal: StudioDirectorProposal,
  characters: StudioCharacterListItem[],
  t: ProposalTextResolver
): StudioStoryboardDetail {
  const characterById = new Map(characters.map((c) => [c.id, c]));

  return {
    ...base,
    aiDirectorPrompt: proposal.ideaPrompt,
    directorProfile: proposal.interpretation.directorProfile,
    promptStyleProfile: proposal.interpretation.promptStyleProfile,
    voiceEnabled: proposal.audio.voiceEnabled,
    voiceProfile: proposal.audio.voiceProfile,
    narrationMode: proposal.audio.narrationMode,
    voiceNarrationScript: proposal.text.narrationScriptPreview || base.voiceNarrationScript,
    musicEnabled: proposal.audio.musicEnabled,
    musicStyle: proposal.audio.musicProfile,
    musicIntensity: proposal.audio.musicIntensity,
    soundEnabled: proposal.audio.soundEnabled,
    soundStyle: proposal.audio.soundProfile,
    soundDensity: proposal.audio.soundDensity,
    scenes: proposal.scenes.map((scene, index) => {
      const copy = resolveProposedSceneText(scene, t);
      const existing = base.scenes.find((s) => s.id === scene.existingSceneId);
      const linkedCharacters = scene.characterRefs
        .map((ref) => characterById.get(ref.existingId))
        .filter((c): c is StudioCharacterListItem => Boolean(c));

      return {
        ...(existing ?? {
          id: scene.tempId,
          storyboardId: base.id,
          transitionToNext: "",
          musicTransitionType: "",
          musicStartBehavior: "",
          musicEndBehavior: "",
          soundCharacterOverride: "",
          soundPropOverride: "",
          soundTransitionOverride: "",
          voicePriority: "",
          musicPriority: "",
          soundPriority: "",
          audioFocus: "",
          duckingMode: "",
          voiceAssetOverride: "",
          musicAssetOverride: "",
          ambienceAssetOverride: "",
          sfxAssetOverride: "",
          selectedSceneImageId: null,
          sceneImages: [],
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        }),
        id: scene.existingSceneId ?? scene.tempId,
        storyboardId: base.id,
        order: index,
        title: copy.title,
        description: copy.description,
        action: copy.action,
        emotion: scene.emotion,
        camera: scene.camera,
        shotType: scene.shotType,
        cameraMovement: scene.cameraMovement,
        sceneEnergy: normalizeStudioSceneEnergy(scene.sceneEnergy),
        durationSeconds: scene.durationSeconds,
        musicCueType: scene.sceneAudio.musicCueType,
        musicEnergyTarget: scene.sceneAudio.musicEnergyTarget,
        soundEnvironmentOverride: scene.sceneAudio.soundEnvironment,
        soundAmbientOverride: scene.sceneAudio.soundAmbient,
        locationId: scene.locationRef?.existingId ?? null,
        location: null,
        characters: linkedCharacters,
        props: [],
      } as StudioSceneDetail;
    }),
  };
}

export function buildProposalRenderReadiness(params: {
  proposal: StudioDirectorProposal;
  baseStoryboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  t: ProposalTextResolver;
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
}): DirectorProposalRenderReadiness {
  const projected = buildProposalAppliedStoryboard(
    params.baseStoryboard,
    params.proposal,
    params.characters,
    params.t
  );
  const unified = buildStudioUnifiedReadiness({
    storyboard: projected,
    characters: params.characters,
    locations: params.locations ?? [],
    props: params.props ?? [],
    worlds: params.worlds ?? [],
    styleProfile: params.proposal.interpretation.promptStyleProfile,
    directorProfile: params.proposal.interpretation.directorProfile,
  });
  return unifiedToProposalRenderReadiness(unified);
}

export function collectProposalSceneAssets(scenes: ProposedScene[]) {
  const characters = new Map<string, string>();
  const locations = new Map<string, string>();
  const props = new Map<string, string>();
  const worlds = new Map<string, string>();

  for (const scene of scenes) {
    for (const ref of scene.characterRefs) {
      characters.set(ref.existingId, ref.name);
    }
    for (const ref of scene.propRefs) {
      props.set(ref.existingId, ref.name);
    }
    if (scene.locationRef) {
      locations.set(scene.locationRef.existingId, scene.locationRef.name);
    }
    if (scene.worldRef) {
      worlds.set(scene.worldRef.existingId, scene.worldRef.name);
    }
  }

  return {
    characters: [...characters.entries()].map(([id, name]) => ({ id, name })),
    locations: [...locations.entries()].map(([id, name]) => ({ id, name })),
    props: [...props.entries()].map(([id, name]) => ({ id, name })),
    worlds: [...worlds.entries()].map(([id, name]) => ({ id, name })),
  };
}
