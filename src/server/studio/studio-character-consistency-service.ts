import { prisma } from "@/lib/prisma";
import {
  buildStoryboardCharacterConsistencyReport,
  type StoryboardCharacterConsistencySceneInput,
} from "@/lib/studio-character-timeline";
import { STUDIO_SCENE_DETAIL_INCLUDE } from "@/server/studio/studio-storyboard-service";
import type { StoryboardCharacterConsistencyReport } from "@/types/studio-character-consistency";
import type { SessionUser } from "@/server/auth/session";
import { studioStoryboardViewerCanModify } from "@/server/studio/studio-storyboard-access";

export async function buildCharacterConsistencyReportForStoryboard(
  storyboardId: string,
  viewer: Pick<SessionUser, "id" | "role">
): Promise<
  | { ok: true; report: StoryboardCharacterConsistencyReport }
  | { ok: false; error: string; status: number }
> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    include: {
      scenes: {
        orderBy: { order: "asc" },
        include: STUDIO_SCENE_DETAIL_INCLUDE,
      },
    },
  });

  if (!storyboard) {
    return { ok: false, error: "Storyboard not found.", status: 404 };
  }
  if (!studioStoryboardViewerCanModify(viewer, storyboard)) {
    return { ok: false, error: "Forbidden.", status: 403 };
  }

  const scenes: StoryboardCharacterConsistencySceneInput[] = storyboard.scenes.map((scene) => {
    const pick =
      (scene.selectedSceneImageId
        ? scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)
        : null) ?? scene.sceneImages.find((img) => img.status === "completed");

    return {
      sceneId: scene.id,
      sceneTitle: scene.title,
      order: scene.order,
      imageId: pick?.id ?? null,
      characters: scene.characters.map((link) => ({
        id: link.character.id,
        name: link.character.name,
        role: link.character.role,
        description: link.character.description,
        personality: link.character.personality,
        referenceImageUrl: link.character.referenceImageUrl,
        appearanceMemory: link.character.appearanceMemory,
        personalityMemory: link.character.personalityMemory,
        continuityNotes: link.character.continuityNotes,
        defaultClothing: link.character.defaultClothing,
        defaultAccessories: link.character.defaultAccessories,
        visualKeywords: link.character.visualKeywords,
        primaryReferenceImageId: link.character.primaryReferenceImageId,
        referenceNotes: link.character.referenceNotes,
        identityStrength: link.character.identityStrength,
        continuityStrength: link.character.continuityStrength,
        worldProfileId: link.character.worldProfileId,
        worldProfile: link.character.worldProfile,
      })),
      consistencyReportJson: pick?.consistencyReport ?? null,
      visionReportJson: pick?.visionReport ?? null,
    };
  });

  const report = buildStoryboardCharacterConsistencyReport({
    storyboardId,
    scenes,
  });

  return { ok: true, report };
}
