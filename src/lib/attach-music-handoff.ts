import { buildMotionMusicHandoffPlan } from "@/lib/studio-music-director";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { MotionSceneMusicCueHandoff } from "@/types/studio-music-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachMusicToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const musicPlan = buildMotionMusicHandoffPlan(options.storyboard);
  const cueByScene = new Map(musicPlan.sceneMusicCues.map((c) => [c.sceneId, c]));

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const cue = cueByScene.get(scene.sceneId);
    if (!cue) {
      return scene;
    }
    const handoffCue: MotionSceneMusicCueHandoff = {
      cueType: cue.cueType,
      narrativeLabel: cue.narrativeLabel,
      energyTarget: cue.energyTarget,
      transitionType: cue.transitionType,
      startBehavior: cue.startBehavior,
      endBehavior: cue.endBehavior,
      duckingRecommended: cue.duckingRecommended,
    };
    return {
      ...scene,
      musicCue: handoffCue,
      studioContext: {
        ...scene.studioContext,
        music: `${cue.narrativeLabel}:${cue.cueType}`,
      },
    };
  });

  return {
    ...payload,
    musicPlan,
    musicProfile: musicPlan.profileId,
    sceneMusicCues: musicPlan.sceneMusicCues,
    musicNarrativeSummary: musicPlan.musicNarrativeSummary,
    musicWarnings: musicPlan.musicWarnings,
    scenes,
  };
}
