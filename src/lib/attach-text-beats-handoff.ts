import {
  buildStudioTextBeatsForHandoffScene,
  hasStudioTextBeatsContent,
} from "@/lib/build-studio-text-beats";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { MotionSceneTextBeatsHandoff } from "@/types/studio-text-beats-handoff";

function toHandoffBeats(
  built: ReturnType<typeof buildStudioTextBeatsForHandoffScene>
): MotionSceneTextBeatsHandoff {
  const {
    sceneId: _sceneId,
    order: _order,
    ...beats
  } = built;
  return beats;
}

export function attachTextBeatsToHandoffPayload(
  payload: MotionHandoffPayload
): MotionHandoffPayload {
  const sorted = [...payload.scenes].sort((a, b) => a.order - b.order);
  const sceneCount = sorted.length;
  const aiDirectorNotes = payload.executionPackage?.aiDirectorNotes?.trim() ?? "";

  const scenes: MotionHandoffScene[] = sorted.map((scene, sceneIndex) => {
    const built = buildStudioTextBeatsForHandoffScene(scene, {
      sceneIndex,
      sceneCount,
      storyboardTitle: payload.title,
      storyboardDescription: payload.description,
      aiDirectorNotes,
    });
    const studioTextBeats = hasStudioTextBeatsContent(built) ? toHandoffBeats(built) : undefined;
    return {
      ...scene,
      studioTextBeats,
    };
  });

  return {
    ...payload,
    scenes,
  };
}
