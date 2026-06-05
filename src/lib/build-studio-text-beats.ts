/**
 * Studio V46 — generate Motion text beats from scene storytelling fields.
 */

import { syncLegacyFieldFromBeats, trimBeats, MAX_LAYER_BEATS } from "@/lib/story-text-beats";
import { detectArcPhaseForIndex } from "@/lib/studio-story-arc";
import type { SceneOverlayTemplate } from "@/lib/story-overlay-templates";
import type {
  MotionSceneTextBeatsHandoff,
  StudioTextBeatBuildResult,
} from "@/types/studio-text-beats-handoff";
import type { MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { StudioSceneDetail } from "@/types/studio-api";

const AUDIO_ONLY_IGNORED = [
  "musicCue",
  "soundCue",
  "audioProduction",
  "voiceSegment",
  "voiceMetadata",
] as const;

export type StudioTextBeatSourceScene = {
  sceneId: string;
  order: number;
  title: string;
  description: string;
  action: string;
  emotion: string;
  sceneEnergy?: string;
  durationSeconds?: number;
  voiceSegmentText?: string;
};

export type BuildStudioTextBeatsInput = {
  scene: StudioTextBeatSourceScene;
  sceneIndex: number;
  sceneCount: number;
  storyboardTitle?: string;
  storyboardDescription?: string;
  aiDirectorNotes?: string;
};

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function splitNarrativeBeats(...parts: string[]): string[] {
  const raw = parts.map(clean).filter(Boolean).join(". ");
  if (!raw) {
    return [];
  }
  return raw
    .split(/[.!?;\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .slice(0, MAX_LAYER_BEATS);
}

function emotionFlavor(emotion: string): string {
  const e = emotion.trim().toLowerCase();
  if (!e) {
    return "";
  }
  const map: Record<string, string> = {
    happy: "warm and uplifting",
    proud: "proud and confident",
    excited: "energetic and exciting",
    focused: "focused and purposeful",
    curious: "curious and inviting",
    serious: "clear and serious",
    celebrating: "celebratory and joyful",
    warm: "warm and welcoming",
  };
  for (const [key, phrase] of Object.entries(map)) {
    if (e.includes(key)) {
      return phrase;
    }
  }
  return e.replace(/_/g, " ");
}

function withEmotionWording(base: string, emotion: string): string {
  const trimmed = clean(base);
  if (!trimmed) {
    return "";
  }
  const flavor = emotionFlavor(emotion);
  if (!flavor || trimmed.toLowerCase().includes(flavor.split(" ")[0]!)) {
    return trimmed;
  }
  return `${trimmed} — ${flavor}`;
}

function pickHeadline(title: string, sceneIndex: number, storyboardTitle: string): string[] {
  const t = clean(title);
  if (!t) {
    if (sceneIndex === 0 && storyboardTitle.trim()) {
      return [clean(storyboardTitle).toUpperCase()];
    }
    return [];
  }
  if (t.length <= 48 || sceneIndex === 0) {
    return [t.toUpperCase()];
  }
  return [];
}

function pickTemplate(params: {
  sceneIndex: number;
  sceneCount: number;
  action: string;
  title: string;
  arcPhase: string;
}): SceneOverlayTemplate {
  if (params.sceneIndex === 0 && clean(params.title).length > 0 && !clean(params.action)) {
    return "hero";
  }
  if (params.arcPhase === "climax" && clean(params.action)) {
    return "hero";
  }
  return "scene";
}

function buildFinaleText(params: {
  scene: StudioTextBeatSourceScene;
  storyboardTitle: string;
  storyboardDescription: string;
  aiDirectorNotes: string;
  arcPhase: string;
}): { heroFinaleText: string; finaleTextBeats: string[] } {
  const parts: string[] = [];
  const desc = clean(params.scene.description);
  const action = clean(params.scene.action);
  const boardTitle = clean(params.storyboardTitle);

  if (params.arcPhase === "resolution" || params.arcPhase === "outro") {
    if (desc) {
      parts.push(desc);
    } else if (action) {
      parts.push(action);
    }
  }
  if (parts.length === 0 && boardTitle) {
    parts.push(boardTitle);
  }
  const note = clean(params.aiDirectorNotes);
  if (note && parts.length === 0) {
    parts.push(note.split(/[.!?]/)[0]?.trim() ?? note);
  }

  const finaleBeats = trimBeats(parts);
  const heroFinale = finaleBeats[0] ?? "";
  return {
    heroFinaleText: heroFinale,
    finaleTextBeats: finaleBeats.length > 1 ? finaleBeats : heroFinale ? [heroFinale] : [],
  };
}

export function studioSceneDetailToBeatSource(scene: StudioSceneDetail): StudioTextBeatSourceScene {
  return {
    sceneId: scene.id,
    order: scene.order,
    title: scene.title,
    description: scene.description,
    action: scene.action,
    emotion: scene.emotion,
    sceneEnergy: scene.sceneEnergy,
    durationSeconds: scene.durationSeconds,
  };
}

export function motionHandoffSceneToBeatSource(scene: MotionHandoffScene): StudioTextBeatSourceScene {
  return {
    sceneId: scene.sceneId,
    order: scene.order,
    title: scene.title,
    description: scene.description,
    action: scene.action,
    emotion: scene.emotion,
    sceneEnergy: scene.sceneEnergy ?? scene.studioContext.sceneEnergy,
    durationSeconds: scene.durationSeconds,
    voiceSegmentText: scene.voiceSegment?.text?.trim(),
  };
}

/** Build Motion-ready text beats from Studio scene storytelling fields. */
export function buildStudioTextBeats(input: BuildStudioTextBeatsInput): StudioTextBeatBuildResult {
  const { scene, sceneIndex, sceneCount } = input;
  const usedFields: string[] = [];
  const ignoredFields: string[] = [...AUDIO_ONLY_IGNORED];

  const title = clean(scene.title);
  const description = clean(scene.description);
  const action = clean(scene.action);
  const emotion = clean(scene.emotion);
  const storyboardTitle = clean(input.storyboardTitle ?? "");
  const storyboardDescription = clean(input.storyboardDescription ?? "");
  const aiDirectorNotes = clean(input.aiDirectorNotes ?? "");
  const arcPhase = detectArcPhaseForIndex(sceneIndex, sceneCount);
  const isLast = sceneIndex === sceneCount - 1;

  if (title) {
    usedFields.push("title");
  }
  if (description) {
    usedFields.push("description");
  }
  if (action) {
    usedFields.push("action");
  }
  if (emotion) {
    usedFields.push("emotion");
  }
  if (sceneIndex === 0 && aiDirectorNotes) {
    usedFields.push("aiDirectorNotes");
  } else if (aiDirectorNotes) {
    ignoredFields.push("aiDirectorNotes");
  }
  if (sceneIndex === 0 && storyboardTitle) {
    usedFields.push("storyboardTitle");
  }
  if (isLast && (storyboardDescription || storyboardTitle)) {
    usedFields.push("storyboardDescription");
  }

  const voiceLine = clean(scene.voiceSegmentText ?? "");
  if (voiceLine) {
    usedFields.push("voiceSegment");
    ignoredFields.splice(ignoredFields.indexOf("voiceSegment"), 1);
  }

  const headlineBeats = trimBeats(pickHeadline(title, sceneIndex, storyboardTitle));
  const titleBeats = trimBeats(title ? [title] : []);
  const subtitleRaw = description || withEmotionWording(action, emotion);
  const subtitleBeats = trimBeats(
    subtitleRaw ? [withEmotionWording(subtitleRaw, emotion)] : []
  );

  const narrativeBeats = splitNarrativeBeats(action, description, voiceLine);
  const beatLines = trimBeats(
    narrativeBeats.filter(
      (line) =>
        line.toLowerCase() !== title.toLowerCase() &&
        line.toLowerCase() !== description.toLowerCase()
    )
  );

  let heroTextBeats = trimBeats(action ? [action] : beatLines.slice(0, 1));
  if (heroTextBeats.length === 0 && beatLines.length > 0) {
    heroTextBeats = [beatLines[0]!];
  }
  const heroText = syncLegacyFieldFromBeats(heroTextBeats);

  let heroFinaleText = "";
  let finaleTextBeats: string[] = [];
  if (isLast) {
    const finale = buildFinaleText({
      scene,
      storyboardTitle,
      storyboardDescription,
      aiDirectorNotes,
      arcPhase,
    });
    heroFinaleText = finale.heroFinaleText;
    finaleTextBeats = finale.finaleTextBeats;
    if (heroFinaleText) {
      usedFields.push("finale");
    }
  }

  if (arcPhase !== "opening") {
    usedFields.push("storyIntelligence");
  }

  const template = pickTemplate({
    sceneIndex,
    sceneCount,
    action,
    title,
    arcPhase,
  });

  const handoff: MotionSceneTextBeatsHandoff = {
    headlineBeats,
    titleBeats,
    subtitleBeats,
    heroTextBeats,
    finaleTextBeats,
    beatLines,
    heroText,
    heroFinaleText,
    template,
    source: "studio_auto",
    usedFields: [...new Set(usedFields)],
    ignoredFields: [...new Set(ignoredFields)],
  };

  return {
    ...handoff,
    sceneId: scene.sceneId,
    order: scene.order,
  };
}

export function buildStudioTextBeatsForHandoffScene(
  scene: MotionHandoffScene,
  context: {
    sceneIndex: number;
    sceneCount: number;
    storyboardTitle: string;
    storyboardDescription: string;
    aiDirectorNotes?: string;
  }
): StudioTextBeatBuildResult {
  return buildStudioTextBeats({
    scene: motionHandoffSceneToBeatSource(scene),
    sceneIndex: context.sceneIndex,
    sceneCount: context.sceneCount,
    storyboardTitle: context.storyboardTitle,
    storyboardDescription: context.storyboardDescription,
    aiDirectorNotes: context.aiDirectorNotes,
  });
}

export function hasStudioTextBeatsContent(beats: MotionSceneTextBeatsHandoff | null | undefined): boolean {
  if (!beats) {
    return false;
  }
  return (
    beats.headlineBeats.length > 0 ||
    beats.titleBeats.length > 0 ||
    beats.subtitleBeats.length > 0 ||
    beats.heroTextBeats.length > 0 ||
    beats.finaleTextBeats.length > 0 ||
    beats.beatLines.length > 0 ||
    beats.heroText.trim().length > 0 ||
    beats.heroFinaleText.trim().length > 0
  );
}
