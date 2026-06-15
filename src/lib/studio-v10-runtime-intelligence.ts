import type {
  StudioV10DialogueLine,
  StudioV10RuntimeBreakdown,
  StudioV10RuntimeConfidence,
  StudioV10SceneProposal,
  StudioV10VoiceOverLine,
} from "@/types/studio-v10-story-planning";

const MIN_SCENE_DISPLAY_SECONDS = 3;
const TRANSITION_SECONDS = 0.35;
const WORDS_PER_SECOND = 2.8;

function estimateSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return 0;
  }
  return Math.max(1.8, words / WORDS_PER_SECOND);
}

function sceneRuntimeSeconds(input: {
  scene: StudioV10SceneProposal;
  voiceOver?: StudioV10VoiceOverLine;
  dialogue: StudioV10DialogueLine[];
}): number {
  const voSeconds = input.voiceOver ? input.voiceOver.durationSeconds : estimateSpeechSeconds(input.scene.voiceOver);
  const dialogueSeconds = input.dialogue
    .filter((d) => d.enabled)
    .reduce((sum, line) => sum + estimateSpeechSeconds(line.dialogue), 0);
  const overlaySeconds = input.scene.overlay.durationSeconds;
  const content = Math.max(voSeconds, dialogueSeconds, overlaySeconds, MIN_SCENE_DISPLAY_SECONDS);
  return Math.round(content * 10) / 10;
}

function resolveConfidence(input: {
  scenes: StudioV10SceneProposal[];
  hasVoice: boolean;
  hasDialogue: boolean;
}): StudioV10RuntimeConfidence {
  if (input.scenes.length === 0) {
    return "low";
  }
  if (input.hasVoice && input.hasDialogue && input.scenes.every((s) => s.voiceOver || s.dialogueLines.length > 0)) {
    return "high";
  }
  if (input.hasVoice || input.hasDialogue) {
    return "medium";
  }
  return "low";
}

export function calculateStudioV10Runtime(input: {
  scenes: StudioV10SceneProposal[];
  voiceOverLines: StudioV10VoiceOverLine[];
  dialogueLines: StudioV10DialogueLine[];
  transitionCount: number;
  musicStructureSeconds?: number;
}): StudioV10RuntimeBreakdown {
  const voByScene = new Map(input.voiceOverLines.map((v) => [v.sceneId, v]));
  const dlgByScene = new Map<string, StudioV10DialogueLine[]>();
  for (const line of input.dialogueLines) {
    const rows = dlgByScene.get(line.sceneId) ?? [];
    rows.push(line);
    dlgByScene.set(line.sceneId, rows);
  }

  const sceneRows = input.scenes.map((scene) => {
    const seconds = sceneRuntimeSeconds({
      scene,
      voiceOver: voByScene.get(scene.id),
      dialogue: dlgByScene.get(scene.id) ?? [],
    });
    return {
      sceneId: scene.id,
      index: scene.index,
      title: scene.title,
      seconds,
    };
  });

  const sceneSum = sceneRows.reduce((sum, row) => sum + row.seconds, 0);
  const transitions = input.transitionCount * TRANSITION_SECONDS;
  const musicPad = input.musicStructureSeconds ?? 0;
  const totalSeconds = Math.round((sceneSum + transitions + musicPad) * 10) / 10;

  const hasVoice = input.voiceOverLines.length > 0 || input.scenes.some((s) => s.voiceOver.trim());
  const hasDialogue = input.dialogueLines.some((d) => d.enabled);

  return {
    scenes: sceneRows,
    totalSeconds,
    confidence: resolveConfidence({ scenes: input.scenes, hasVoice, hasDialogue }),
    factors: [
      `voice_over:${hasVoice ? "yes" : "no"}`,
      `dialogue:${hasDialogue ? "yes" : "no"}`,
      `scenes:${input.scenes.length}`,
      `transitions:${input.transitionCount}`,
      `min_display:${MIN_SCENE_DISPLAY_SECONDS}s`,
    ],
  };
}
