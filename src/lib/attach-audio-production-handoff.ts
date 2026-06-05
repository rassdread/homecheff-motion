import { buildMotionAudioProductionHandoffPlan } from "@/lib/studio-audio-production-director";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { MotionSceneAudioProductionHandoff } from "@/types/studio-audio-production-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachAudioProductionToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const audioProductionPlan = buildMotionAudioProductionHandoffPlan(options.storyboard);
  const cueByScene = new Map(audioProductionPlan.sceneCues.map((c) => [c.sceneId, c]));

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const cue = cueByScene.get(scene.sceneId);
    if (!cue) {
      return scene;
    }
    const handoffCue: MotionSceneAudioProductionHandoff = {
      audioFocus: cue.audioFocus,
      voicePriority: cue.voicePriority,
      musicPriority: cue.musicPriority,
      soundPriority: cue.soundPriority,
      duckingRecommendations: cue.duckingRecommendations,
      mixRecommendation: cue.mixRecommendation,
    };
    return {
      ...scene,
      audioProduction: handoffCue,
      studioContext: {
        ...scene.studioContext,
        audioFocus: cue.audioFocus,
      },
    };
  });

  return {
    ...payload,
    audioProductionPlan,
    audioFocusSummary: audioProductionPlan.audioFocusSummary,
    audioWarnings: audioProductionPlan.audioWarnings,
    scenes,
  };
}
