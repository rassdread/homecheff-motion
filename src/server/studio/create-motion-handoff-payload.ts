import type { SessionUser } from "@/server/auth/session";
import {
  getStoryboardSnapshotById,
  type ServiceError,
} from "@/server/studio/studio-storyboard-service";
import { buildScenePrompt } from "@/lib/studio-prompt-builder";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

function buildStudioContext(
  storyboardId: string,
  scene: SceneSnapshot,
  prompt: ReturnType<typeof buildScenePrompt>
): StudioSceneContextMetadata {
  const noteParts = [scene.description.trim(), scene.action.trim()].filter(Boolean);
  return {
    source: "studio",
    storyboardId,
    sceneId: scene.sceneId,
    action: scene.action,
    emotion: scene.emotion,
    camera: scene.camera,
    transitionToNext: scene.transitionToNext,
    location: scene.location,
    characters: scene.characters,
    props: scene.props,
    notes: noteParts.join("\n"),
    voice: scene.voice,
    music: scene.music,
    generatedPrompt: prompt.metadata.generatedPrompt,
    stylePrompt: prompt.stylePrompt,
    continuityPrompt: prompt.continuityPrompt,
    promptVersion: prompt.metadata,
  };
}

function toHandoffScene(
  storyboardId: string,
  scene: SceneSnapshot,
  styleProfile: string
): MotionHandoffScene {
  const built = buildScenePrompt(scene, styleProfile);
  return {
    ...scene,
    notes: scene.notes ?? [scene.description.trim(), scene.action.trim()].filter(Boolean).join("\n"),
    studioContext: buildStudioContext(storyboardId, scene, built),
    generatedPrompt: built.metadata.generatedPrompt,
    stylePrompt: built.stylePrompt,
    continuityPrompt: built.continuityPrompt,
    promptVersion: built.metadata,
  };
}

export async function createMotionHandoffPayload(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<{ payload: MotionHandoffPayload } | { error: ServiceError }> {
  const snapshot = await getStoryboardSnapshotById(storyboardId, viewer);
  if (!snapshot) {
    return { error: serviceError("NOT_FOUND", "Storyboard not found.", 404) };
  }

  if (snapshot.scenes.length === 0) {
    return {
      error: serviceError(
        "NO_SCENES",
        "Add at least one scene before opening in Motion.",
        400
      ),
    };
  }

  const styleProfile = snapshot.promptStyleProfile;

  const payload: MotionHandoffPayload = {
    version: MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: snapshot.id,
    title: snapshot.title,
    description: snapshot.description,
    promptStyleProfile: styleProfile,
    scenes: snapshot.scenes.map((scene) => toHandoffScene(snapshot.id, scene, styleProfile)),
  };

  return { payload };
}
