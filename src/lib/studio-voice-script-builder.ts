/**
 * Studio V28 — narration script generation (voice-ready text, no TTS).
 */

import {
  interpretAiDirectorPrompt,
  type InterpretedDirectorStyle,
} from "@/lib/studio-ai-director-interpreter";
import { buildStoryArc, type StoryArcPhase } from "@/lib/studio-story-arc";
import {
  normalizeStudioNarrationMode,
  type StudioNarrationMode,
  type StudioVoiceProfilePreset,
} from "@/lib/studio-voice-profiles";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export type VoiceScriptSceneLine = {
  sceneId: string;
  order: number;
  title: string;
  arcPhase: StoryArcPhase;
  text: string;
};

export type VoiceScriptBundle = {
  fullNarration: string;
  sceneNarrations: VoiceScriptSceneLine[];
  shortNarration: string;
  subtitleNarration: string;
};

const MODE_INTRO: Record<StudioNarrationMode, string> = {
  narrator: "This is the story of",
  founder: "I built this because",
  documentary: "In this chapter, we explore",
  commercial: "Discover how",
  cinematic: "A story unfolds —",
  educational: "In this lesson, you'll learn how",
};

function orderedScenes(storyboard: StudioStoryboardDetail): StudioSceneDetail[] {
  return [...storyboard.scenes].sort((a, b) => a.order - b.order);
}

function sceneNarrationLine(
  scene: StudioSceneDetail,
  arcPhase: StoryArcPhase,
  mode: StudioNarrationMode
): string {
  const title = scene.title.trim();
  const description = scene.description.trim();
  const action = scene.action.trim();
  const emotion = scene.emotion.trim();
  const location = scene.location?.name.trim();

  const parts: string[] = [];
  if (title) {
    parts.push(title);
  }
  if (description) {
    parts.push(description);
  } else if (action) {
    parts.push(action);
  }
  if (location && !parts.join(" ").toLowerCase().includes(location.toLowerCase())) {
    parts.push(`at ${location}`);
  }
  if (emotion && arcPhase === "climax") {
    parts.push(`with ${emotion} energy`);
  }

  let line = parts.filter(Boolean).join(". ").replace(/\.\s*\./g, ".");
  if (!line) {
    line = `Scene ${scene.order + 1}.`;
  }

  if (mode === "documentary" && arcPhase === "opening") {
    line = `We begin. ${line}`;
  }
  if (mode === "founder" && arcPhase === "climax") {
    line = `This moment mattered most. ${line}`;
  }

  return line.endsWith(".") ? line : `${line}.`;
}

function buildOpeningLine(
  storyboard: StudioStoryboardDetail,
  mode: StudioNarrationMode,
  interpretation: InterpretedDirectorStyle
): string {
  const title = storyboard.title.trim();
  const description = storyboard.description.trim();
  const mood = interpretation.moodKeywords.slice(0, 2).join(" and ");
  const intro = MODE_INTRO[mode];
  if (title && description) {
    return `${intro} ${title}: ${description}`.replace(/\s+/g, " ").trim();
  }
  if (title) {
    return `${intro} ${title}${mood ? ` — ${mood} in tone` : ""}.`.replace(/\s+/g, " ");
  }
  return `${intro} this story${mood ? `, told with a ${mood} voice` : ""}.`;
}

export function buildVoiceScriptBundle(params: {
  storyboard: StudioStoryboardDetail;
  narrationMode?: string;
  aiDirectorPrompt?: string;
  language?: string;
}): VoiceScriptBundle {
  const storyboard = params.storyboard;
  const scenes = orderedScenes(storyboard);
  const mode = normalizeStudioNarrationMode(params.narrationMode ?? storyboard.narrationMode);
  const interpretation = interpretAiDirectorPrompt(
    params.aiDirectorPrompt ?? storyboard.aiDirectorPrompt ?? ""
  );

  const arc = buildStoryArc(
    scenes.map((s) => ({
      sceneId: s.id,
      order: s.order,
      title: s.title,
      shotType: s.shotType,
      cameraMovement: s.cameraMovement,
      sceneEnergy: s.sceneEnergy,
      camera: s.camera,
    }))
  );
  const arcById = new Map(arc.map((e) => [e.sceneId, e.phase]));

  const opening = buildOpeningLine(storyboard, mode, interpretation);
  const sceneNarrations: VoiceScriptSceneLine[] = scenes.map((scene) => {
    const phase = arcById.get(scene.id) ?? "build_up";
    return {
      sceneId: scene.id,
      order: scene.order,
      title: scene.title.trim() || `Scene ${scene.order + 1}`,
      arcPhase: phase,
      text: sceneNarrationLine(scene, phase, mode),
    };
  });

  const body = sceneNarrations.map((row) => row.text).join(" ");
  const fullNarration = [opening, body].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  const shortNarration =
    scenes.length <= 2
      ? fullNarration
      : [
          opening,
          sceneNarrations[0]?.text,
          sceneNarrations[Math.floor(sceneNarrations.length / 2)]?.text,
          sceneNarrations[sceneNarrations.length - 1]?.text,
        ]
          .filter(Boolean)
          .join(" ");

  const subtitleNarration = sceneNarrations
    .map((row) => row.text.replace(/\.\s*$/, ""))
    .join(" | ");

  return {
    fullNarration,
    sceneNarrations,
    shortNarration: shortNarration.trim(),
    subtitleNarration: subtitleNarration.trim(),
  };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function estimateSecondsFromWords(words: number, wpm: number): number {
  if (words <= 0 || wpm <= 0) {
    return 0;
  }
  return Math.round((words / wpm) * 60 * 10) / 10;
}

export function cleanVoiceScript(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();
}

export function applyVoiceProfileToneHints(
  bundle: VoiceScriptBundle,
  _preset: StudioVoiceProfilePreset
): VoiceScriptBundle {
  return {
    ...bundle,
    fullNarration: cleanVoiceScript(bundle.fullNarration),
    shortNarration: cleanVoiceScript(bundle.shortNarration),
    subtitleNarration: cleanVoiceScript(bundle.subtitleNarration),
    sceneNarrations: bundle.sceneNarrations.map((row) => ({
      ...row,
      text: cleanVoiceScript(row.text),
    })),
  };
}
