import { buildMotionSoundHandoffPlan } from "@/lib/studio-sound-director";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { MotionSceneSoundCueHandoff } from "@/types/studio-sound-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

function summarizeSceneSound(cue: MotionSceneSoundCueHandoff): string {
  const parts = [
    ...cue.environmentSounds.slice(0, 2),
    ...cue.characterSounds.slice(0, 1),
    ...cue.transitionSounds.filter((t) => t !== "none").slice(0, 1),
  ];
  return parts.join(",") || "none";
}

export function attachSoundToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const soundPlan = buildMotionSoundHandoffPlan(options.storyboard);
  const cueByScene = new Map(soundPlan.sceneSoundCues.map((c) => [c.sceneId, c]));

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const cue = cueByScene.get(scene.sceneId);
    if (!cue) {
      return scene;
    }
    const handoffCue: MotionSceneSoundCueHandoff = {
      environmentSounds: cue.environmentSounds,
      characterSounds: cue.characterSounds,
      propSounds: cue.propSounds,
      transitionSounds: cue.transitionSounds,
      ambientRecommendation: cue.ambientRecommendation,
      duckingRecommended: cue.duckingRecommended,
    };
    return {
      ...scene,
      soundCue: handoffCue,
      studioContext: {
        ...scene.studioContext,
        sfx: summarizeSceneSound(handoffCue),
      },
    };
  });

  return {
    ...payload,
    soundPlan,
    soundProfile: soundPlan.profileId,
    sceneSoundCues: soundPlan.sceneSoundCues,
    soundWarnings: soundPlan.soundWarnings,
    scenes,
  };
}
