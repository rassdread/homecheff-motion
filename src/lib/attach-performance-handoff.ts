import {
  buildCharacterPerformanceAssignments,
  buildCharacterPerformanceState,
  buildPerformanceStatesForHandoff,
  getPerformanceEmotionModifier,
  getPerformanceEnergyModifiers,
  resolveActiveSpeakerCharacterForScene,
} from "@/lib/studio-character-performance";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type {
  ActiveSpeakerPerformanceData,
  PerformanceEmotionModifier,
} from "@/types/studio-character-performance";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { matchCharacterBySpeakerName } from "@/lib/studio-character-voice";

export function attachPerformanceToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const characterPerformanceProfiles = buildCharacterPerformanceAssignments(
    options.storyboard
  );
  const voiceSegments = payload.voiceSegments ?? [];
  const performanceStates = buildPerformanceStatesForHandoff({
    storyboard: options.storyboard,
    voiceSegments,
  });

  const segmentByScene = new Map(voiceSegments.map((s) => [s.sceneId, s]));
  const emotionModifiers: Record<string, PerformanceEmotionModifier> = {};
  for (const scene of options.storyboard.scenes) {
    const key = (scene.emotion ?? "").trim() || "neutral";
    if (!emotionModifiers[key]) {
      emotionModifiers[key] = getPerformanceEmotionModifier(key);
    }
  }

  const activeSpeakerData: ActiveSpeakerPerformanceData[] = [];

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const storyboardScene = options.storyboard.scenes.find((s) => s.id === scene.sceneId);
    const segment = segmentByScene.get(scene.sceneId);
    const emotion = storyboardScene?.emotion ?? "";
    const sceneEnergy = storyboardScene?.sceneEnergy ?? "neutral";

    let speakerPerformance = null as ReturnType<
      typeof resolveActiveSpeakerCharacterForScene
    >;
    if (storyboardScene) {
      speakerPerformance = resolveActiveSpeakerCharacterForScene(
        {
          characters: storyboardScene.characters,
          emotion,
          sceneEnergy,
        },
        segment
      );
      if (speakerPerformance && segment?.speaker) {
        const ch = matchCharacterBySpeakerName(
          String(segment.speaker),
          storyboardScene.characters ?? []
        );
        if (ch) {
          speakerPerformance = buildCharacterPerformanceState({
            character: ch,
            activeSpeaker: true,
            emotion,
            sceneEnergy,
            voiceSegment: segment,
          });
          activeSpeakerData.push({
            sceneId: scene.sceneId,
            characterId: ch.id,
            speakerName: segment.speaker,
            state: speakerPerformance,
          });
        }
      } else if (speakerPerformance) {
        activeSpeakerData.push({
          sceneId: scene.sceneId,
          characterId: speakerPerformance.characterId,
          speakerName: speakerPerformance.characterName,
          state: speakerPerformance,
        });
      }
    }

    return {
      ...scene,
      speakerPerformance: speakerPerformance ?? undefined,
    };
  });

  return {
    ...payload,
    characterPerformanceProfiles,
    performanceStates,
    activeSpeakerData,
    emotionModifiers,
    energyModifiers: getPerformanceEnergyModifiers(),
    scenes,
  };
}
