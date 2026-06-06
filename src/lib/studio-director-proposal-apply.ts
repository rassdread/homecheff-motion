/**
 * Studio V2 — apply AI Director proposals via existing Studio APIs.
 * Never auto-creates proposed-new assets; only links existing library IDs.
 */

import type { TranslationKey } from "@/i18n";
import type { StudioSceneCreateInput, StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import type { StudioStoryboardUpdateInput } from "@/lib/studio-storyboard-validation";
import {
  createStudioSceneApi,
  updateStudioSceneApi,
  updateStudioStoryboardApi,
} from "@/lib/studio-storyboards-client";
import type { StudioSceneDetail } from "@/types/studio-api";
import type {
  DirectorProposalApplyMode,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";

export type ProposalTextResolver = (
  key: TranslationKey,
  params?: Record<string, string>
) => string;

export function resolveProposedSceneText(
  scene: ProposedScene,
  t: ProposalTextResolver
): { title: string; description: string; action: string } {
  const title =
    scene.titleKey ?
      t(scene.titleKey as TranslationKey, scene.titleParams)
    : scene.titleParams.title ?? "";
  const description =
    scene.descriptionKey ?
      t(scene.descriptionKey as TranslationKey, scene.descriptionParams)
    : scene.descriptionParams.description ?? "";
  const action =
    scene.actionKey ?
      t(scene.actionKey as TranslationKey, scene.actionParams)
    : "";
  return { title, description, action };
}

export function proposedSceneToCreateInput(
  scene: ProposedScene,
  t: ProposalTextResolver
): StudioSceneCreateInput {
  const copy = resolveProposedSceneText(scene, t);
  return {
    title: copy.title,
    description: copy.description,
    action: copy.action,
    emotion: scene.emotion,
    camera: scene.camera,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    durationSeconds: scene.durationSeconds,
    locationId: scene.locationRef?.existingId ?? null,
    characterIds: scene.characterRefs.map((c) => c.existingId),
    propIds: scene.propRefs.map((p) => p.existingId),
  };
}

export function proposedSceneToUpdateInput(
  scene: ProposedScene,
  mode: DirectorProposalApplyMode,
  t: ProposalTextResolver
): StudioSceneUpdateInput {
  const copy = resolveProposedSceneText(scene, t);

  if (mode === "assets") {
    return {
      locationId: scene.locationRef?.existingId ?? null,
      characterIds: scene.characterRefs.map((c) => c.existingId),
      propIds: scene.propRefs.map((p) => p.existingId),
    };
  }

  const base: StudioSceneUpdateInput = {
    title: copy.title || undefined,
    description: copy.description || undefined,
    action: copy.action || undefined,
    emotion: scene.emotion,
    camera: scene.camera,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    durationSeconds: scene.durationSeconds,
    locationId: scene.locationRef?.existingId ?? null,
    characterIds: scene.characterRefs.map((c) => c.existingId),
    propIds: scene.propRefs.map((p) => p.existingId),
  };

  if (mode === "all") {
    return {
      ...base,
      musicCueType: scene.sceneAudio.musicCueType || undefined,
      musicEnergyTarget: scene.sceneAudio.musicEnergyTarget || undefined,
      soundEnvironmentOverride: scene.sceneAudio.soundEnvironment || undefined,
      soundAmbientOverride: scene.sceneAudio.soundAmbient || undefined,
    };
  }

  return base;
}

export function proposedSceneToAudioUpdateInput(scene: ProposedScene): StudioSceneUpdateInput {
  return {
    musicCueType: scene.sceneAudio.musicCueType || undefined,
    musicEnergyTarget: scene.sceneAudio.musicEnergyTarget || undefined,
    soundEnvironmentOverride: scene.sceneAudio.soundEnvironment || undefined,
    soundAmbientOverride: scene.sceneAudio.soundAmbient || undefined,
  };
}

export function proposalToStoryboardPatch(
  proposal: StudioDirectorProposal,
  mode: DirectorProposalApplyMode
): StudioStoryboardUpdateInput | null {
  if (mode === "assets") {
    return null;
  }

  const audioPatch = {
    voiceEnabled: proposal.audio.voiceEnabled,
    voiceProfile: proposal.audio.voiceProfile,
    narrationMode: proposal.audio.narrationMode,
    musicEnabled: proposal.audio.musicEnabled,
    musicStyle: proposal.audio.musicProfile,
    musicIntensity: proposal.audio.musicIntensity,
    soundEnabled: proposal.audio.soundEnabled,
    soundStyle: proposal.audio.soundProfile,
    soundDensity: proposal.audio.soundDensity,
  };

  if (mode === "audio") {
    return audioPatch;
  }

  if (mode === "text") {
    const script = proposal.text.narrationScriptPreview.trim();
    if (!script) {
      return null;
    }
    return {
      voiceEnabled: true,
      voiceNarrationScript: script,
    };
  }

  return {
    aiDirectorPrompt: proposal.ideaPrompt,
    aiDirectorStyleStrength: proposal.styleStrength,
    directorProfile: proposal.interpretation.directorProfile,
    promptStyleProfile: proposal.interpretation.promptStyleProfile,
    ...(mode === "all" ? audioPatch : {}),
  };
}

export type ApplyDirectorProposalResult = {
  ok: boolean;
  createdSceneIds: string[];
  updatedSceneIds: string[];
  skippedNewAssets: number;
  errors: string[];
};

export async function applyDirectorProposal(params: {
  storyboardId: string;
  proposal: StudioDirectorProposal;
  mode: DirectorProposalApplyMode;
  existingScenes: StudioSceneDetail[];
  t: ProposalTextResolver;
}): Promise<ApplyDirectorProposalResult> {
  const errors: string[] = [];
  const createdSceneIds: string[] = [];
  const updatedSceneIds: string[] = [];
  let skippedNewAssets = 0;

  for (const scene of params.proposal.scenes) {
    skippedNewAssets +=
      scene.proposedCharacters.length + (scene.proposedLocation ? 1 : 0) + scene.proposedProps.length;
  }

  const storyboardPatch = proposalToStoryboardPatch(params.proposal, params.mode);
  if (storyboardPatch) {
    const res = await updateStudioStoryboardApi(params.storyboardId, storyboardPatch);
    if (!res.ok) {
      errors.push(`storyboard_update_${res.status}`);
    }
  }

  if (params.mode === "assets" || params.mode === "all" || params.mode === "scenes") {
    const existingByOrder = [...params.existingScenes].sort((a, b) => a.order - b.order);

    for (const proposed of params.proposal.scenes) {
      const updateBody = proposedSceneToUpdateInput(proposed, params.mode, params.t);
      const targetId =
        proposed.existingSceneId ?? existingByOrder[proposed.order]?.id ?? null;

      if (targetId) {
        const res = await updateStudioSceneApi(params.storyboardId, targetId, updateBody);
        if (res.ok) {
          updatedSceneIds.push(targetId);
        } else {
          errors.push(`scene_update_${targetId}_${res.status}`);
        }
        continue;
      }

      if (params.mode === "assets") {
        continue;
      }

      const createBody = proposedSceneToCreateInput(proposed, params.t);
      const res = await createStudioSceneApi(params.storyboardId, createBody);
      if (res.ok && res.data.scene) {
        createdSceneIds.push(res.data.scene.id);
      } else {
        errors.push(`scene_create_${proposed.order}_${res.status}`);
      }
    }
  }

  if (params.mode === "audio") {
    const existingByOrder = [...params.existingScenes].sort((a, b) => a.order - b.order);
    for (const proposed of params.proposal.scenes) {
      const targetId =
        proposed.existingSceneId ?? existingByOrder[proposed.order]?.id ?? null;
      if (!targetId) {
        continue;
      }
      const res = await updateStudioSceneApi(
        params.storyboardId,
        targetId,
        proposedSceneToAudioUpdateInput(proposed)
      );
      if (res.ok) {
        updatedSceneIds.push(targetId);
      } else {
        errors.push(`scene_audio_${targetId}_${res.status}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    createdSceneIds,
    updatedSceneIds,
    skippedNewAssets,
    errors,
  };
}
