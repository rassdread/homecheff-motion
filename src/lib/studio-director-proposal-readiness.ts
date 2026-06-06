/**
 * Studio V2 — render readiness projection for AI Director proposals.
 */

import { buildStudioTextBeats, studioSceneDetailToBeatSource } from "@/lib/build-studio-text-beats";
import { resolveProposedSceneText, type ProposalTextResolver } from "@/lib/studio-director-proposal-apply";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import { normalizeStudioSceneEnergy } from "@/lib/studio-scene-director";
import type { StudioCharacterListItem, StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type {
  DirectorProposalRenderReadiness,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";

function recommendationForCheck(id: string, passed: boolean): string | null {
  if (passed) {
    return null;
  }
  const map: Record<string, string> = {
    scenes: "studio.directorProposal.readiness.rec.scenes",
    characters: "studio.directorProposal.readiness.rec.characters",
    location: "studio.directorProposal.readiness.rec.location",
    voice: "studio.directorProposal.readiness.rec.voice",
    text_beats: "studio.directorProposal.readiness.rec.textBeats",
    emotion: "studio.directorProposal.readiness.rec.emotion",
    images: "studio.directorProposal.readiness.rec.images",
  };
  return map[id] ?? null;
}

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
}): DirectorProposalRenderReadiness {
  const projected = buildProposalAppliedStoryboard(
    params.baseStoryboard,
    params.proposal,
    params.characters,
    params.t
  );
  const scenes = [...projected.scenes].sort((a, b) => a.order - b.order);
  const sceneCount = scenes.length;

  const hasCharacters = params.proposal.scenes.some((s) => s.characterRefs.length > 0);
  const hasLocation = params.proposal.scenes.some((s) => s.locationRef);
  const voiceOk =
    !projected.voiceEnabled ||
    Boolean(projected.voiceProfile?.trim() || projected.voiceNarrationScript?.trim()) ||
    params.proposal.voices.characterVoices.some((v) => v.voiceEnabled);
  const imagesOk =
    sceneCount > 0 && scenes.every((s) => sceneHasCompletedImage(s));

  let textBeatsOk = false;
  let emotionOk = false;
  if (sceneCount > 0) {
    textBeatsOk =
      params.proposal.text.sceneOverlays.length > 0 ||
      Boolean(params.proposal.text.narrationScriptPreview.trim()) ||
      scenes.some((scene, index) => {
        const beats = buildStudioTextBeats({
          scene: studioSceneDetailToBeatSource(scene),
          sceneIndex: index,
          sceneCount,
          storyboardTitle: projected.title,
          storyboardDescription: projected.description,
          aiDirectorNotes: projected.aiDirectorPrompt,
        });
        return beats.beatLines.length > 0 || beats.headlineBeats.length > 0;
      });
    emotionOk = scenes.filter((s) => s.emotion?.trim()).length >= Math.ceil(sceneCount * 0.6);
  }

  const checks = [
    {
      id: "scenes",
      messageKey: "studio.directorProposal.readiness.check.scenes",
      passed: sceneCount >= 2,
    },
    {
      id: "characters",
      messageKey: "studio.directorProposal.readiness.check.characters",
      passed: hasCharacters,
    },
    {
      id: "location",
      messageKey: "studio.directorProposal.readiness.check.location",
      passed: hasLocation,
    },
    {
      id: "voice",
      messageKey: "studio.directorProposal.readiness.check.voice",
      passed: voiceOk,
    },
    {
      id: "text_beats",
      messageKey: "studio.directorProposal.readiness.check.textBeats",
      passed: textBeatsOk,
    },
    {
      id: "emotion",
      messageKey: "studio.directorProposal.readiness.check.emotion",
      passed: emotionOk,
    },
    {
      id: "images",
      messageKey: "studio.directorProposal.readiness.check.images",
      passed: imagesOk,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const level: DirectorProposalRenderReadiness["level"] =
    score >= 85 ? "ready"
    : score >= 55 ? "almost_ready"
    : "needs_work";

  const recommendationKeys = checks
    .map((c) => recommendationForCheck(c.id, c.passed))
    .filter((k): k is string => Boolean(k));

  return { level, score, checks, recommendationKeys };
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
