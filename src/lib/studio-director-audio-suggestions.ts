import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioAudioAssetKind } from "@/types/studio-audio-change-plan";

export type StudioDirectorAudioSuggestion = {
  id: string;
  kind: StudioAudioAssetKind;
  title: string;
  instruction: string;
  applyTarget: "project" | "scene" | "character";
  sceneId?: string;
  sceneIndex?: number;
  prompt?: string;
  mood?: string;
  sfxCategory?: string;
};

export function buildStudioDirectorAudioSuggestions(input: {
  storyboard: StudioStoryboardDetail;
  sceneId?: string;
  sceneIndex?: number;
}): StudioDirectorAudioSuggestion[] {
  const suggestions: StudioDirectorAudioSuggestion[] = [];
  const { storyboard, sceneId, sceneIndex } = input;

  if (!storyboard.voiceEnabled) {
    suggestions.push({
      id: "director_audio_voice_nl",
      kind: "voice",
      title: "Nederlandse stem",
      instruction: "Gebruik een energieke Nederlandse stem voor het project",
      applyTarget: "project",
      prompt: "energetic Dutch narrator",
    });
  }

  if (!storyboard.audioAssetLinks?.musicAssetId) {
    suggestions.push({
      id: "director_audio_warm_music",
      kind: "music",
      title: "Warme muziek",
      instruction: "Voeg warme achtergrondmuziek toe aan het project",
      applyTarget: "project",
      mood: "warm",
      prompt: "warm uplifting background music",
    });
  }

  if (sceneId !== undefined) {
    suggestions.push({
      id: `director_audio_dialogue_${sceneId}`,
      kind: "voice",
      title: "Dialoog voorstel",
      instruction: `Voeg dialoog toe in scène ${(sceneIndex ?? 0) + 1} — wacht op goedkeuring via Change Plan`,
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      prompt: "friendly dialogue line for scene",
    });
    suggestions.push({
      id: `director_audio_voiceover_${sceneId}`,
      kind: "voice",
      title: "Voice-over voorstel",
      instruction: `Voeg voice-over toe in scène ${(sceneIndex ?? 0) + 1} — wacht op goedkeuring via Change Plan`,
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      prompt: "warm narrator voice-over for scene",
    });
    suggestions.push({
      id: `director_audio_overlay_${sceneId}`,
      kind: "sound_effect",
      title: "Overlay tekst",
      instruction: `Pas overlay titel aan voor scène ${(sceneIndex ?? 0) + 1} — wacht op goedkeuring via Change Plan`,
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      prompt: "overlay header text update",
    });
    suggestions.push({
      id: `director_audio_scene_pacing_${sceneId}`,
      kind: "voice",
      title: "Scene-pacing",
      instruction: `Herbalanceer scène ${(sceneIndex ?? 0) + 1} (duur/actie) — wacht op goedkeuring via Change Plan`,
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      prompt: "scene pacing and action refinement",
    });
    suggestions.push({
      id: `director_audio_kitchen_${sceneId}`,
      kind: "sound_effect",
      title: "Keukenambience",
      instruction: `Voeg keukenambience toe in scène ${(sceneIndex ?? 0) + 1}`,
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      sfxCategory: "ambience",
      prompt: "kitchen ambience subtle cooking sounds",
    });
  }

  if (!storyboard.audioAssetLinks?.musicAssetId && sceneId) {
    suggestions.push({
      id: `director_audio_epic_finale_${sceneId}`,
      kind: "music",
      title: "Epische finale",
      instruction: "Maak de finale epischer met muziek — wacht op goedkeuring via Change Plan",
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      mood: "cinematic",
      prompt: "epic cinematic finale swell",
    });
  }

  if ((storyboard.scenes?.length ?? 0) >= 2 && sceneId !== undefined) {
    suggestions.push({
      id: `director_audio_runtime_balance_${sceneId}`,
      kind: "music",
      title: "Runtime balanceren",
      instruction: `Verleng of verkort scène ${(sceneIndex ?? 0) + 1} voor betere totale speelduur — wacht op goedkeuring via Change Plan`,
      applyTarget: "scene",
      sceneId,
      sceneIndex,
      mood: "balanced",
      prompt: "adjust scene runtime with music pacing",
    });
  }

  return suggestions;
}
