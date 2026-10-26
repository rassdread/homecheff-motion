/**
 * Projects an existing creative-project storyboard into the film editor
 * document. Scene ids and the project title stay the creative project's.
 */

import {
  buildDutchSubtitleTrack,
  composeCharacterScene,
  type FilmScenePlan,
  type StudioFilmProjectDocument,
} from "@/lib/studio-film-pipeline";

export type CreativeFilmSceneInput = {
  id: string;
  order: number;
  title: string;
  dialogueText?: string | null;
  subtitleText?: string | null;
  durationSeconds?: number;
  characterId?: string | null;
};

export function filmDocumentFromCreativeProject(input: {
  title: string;
  scenes: CreativeFilmSceneInput[];
}): StudioFilmProjectDocument {
  const scenes: FilmScenePlan[] = [...input.scenes]
    .sort((left, right) => left.order - right.order)
    .map((scene) => {
      const durationSeconds = scene.durationSeconds && scene.durationSeconds > 0 ? scene.durationSeconds : 5;
      const dialogue = scene.dialogueText?.trim() ?? "";
      const subtitle = scene.subtitleText?.trim() || dialogue;
      return {
        id: scene.id,
        order: scene.order,
        characterId: scene.characterId ?? null,
        voiceRole: "american_female",
        englishTitle: scene.title,
        englishDialogue: dialogue,
        dutchSubtitle: subtitle,
        musicTrackId: null,
        sourceSceneId: scene.id,
        durationSeconds,
        shots: composeCharacterScene({
          sceneId: scene.id,
          characterId: scene.characterId ?? scene.id,
          durationSeconds,
          dialogueStartSeconds: 0.4,
          dialogueDurationSeconds: Math.max(1, durationSeconds - 0.8),
        }).map((shot) => ({ ...shot, characterId: scene.characterId ?? null })),
      };
    });
  return {
    version: 1,
    title: input.title,
    characterIds: [...new Set(scenes.map((scene) => scene.characterId).filter((id): id is string => Boolean(id)))],
    scenes,
    sfxCues: [],
    subtitles: buildDutchSubtitleTrack(scenes).cues,
    logo: { enabled: true, position: "top-right" },
    cta: { title: "", subtitle: "", website: "" },
    export: {
      width: 720,
      height: 1280,
      videoCodec: "h264",
      audioCodec: "aac",
      subtitleMode: "burn_in",
      subtitleLanguage: "nl-NL",
      visualLanguage: "en",
    },
  };
}
