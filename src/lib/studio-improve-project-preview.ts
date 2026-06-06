/**
 * One-click improve preview (no auto-save).
 */

import { buildAutoShotPlan } from "@/lib/studio-auto-shot-planner";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

export type ImprovePreviewItem = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  changes: Array<{
    fieldKey: string;
    from: string;
    to: string;
  }>;
};

export type ImproveProjectPreview = {
  sceneCount: number;
  items: ImprovePreviewItem[];
};

export function buildImproveProjectPreview(
  storyboard: StudioStoryboardDetail
): ImproveProjectPreview {
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const flow = storyboardToFlowInput(storyboard);
  const plan = buildAutoShotPlan(flow, directorProfile);
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const items: ImprovePreviewItem[] = [];

  for (const scene of scenes) {
    const recommended = plan.find((p) => p.sceneId === scene.id);
    if (!recommended) {
      continue;
    }
    const changes: ImprovePreviewItem["changes"] = [];

    if (recommended.shotType && recommended.shotType !== scene.shotType) {
      changes.push({
        fieldKey: "studio.aiAssistant.improve.field.shot",
        from: scene.shotType || "—",
        to: recommended.shotType,
      });
    }
    if (
      recommended.cameraMovement &&
      recommended.cameraMovement !== scene.cameraMovement
    ) {
      changes.push({
        fieldKey: "studio.aiAssistant.improve.field.camera",
        from: scene.cameraMovement || "static",
        to: recommended.cameraMovement,
      });
    }
    if (recommended.sceneEnergy && recommended.sceneEnergy !== scene.sceneEnergy) {
      changes.push({
        fieldKey: "studio.aiAssistant.improve.field.energy",
        from: scene.sceneEnergy || "neutral",
        to: recommended.sceneEnergy,
      });
    }

    if (changes.length > 0) {
      items.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        changes,
      });
    }
  }

  return { sceneCount: scenes.length, items };
}

export function applyImprovePreviewToScenes(
  scenes: StudioSceneDetail[],
  preview: ImproveProjectPreview
): StudioSceneDetail[] {
  const plan = buildAutoShotPlan(
    scenes.map((s) => ({
      sceneId: s.id,
      order: s.order,
      title: s.title,
      shotType: s.shotType,
      cameraMovement: s.cameraMovement,
      sceneEnergy: s.sceneEnergy,
      camera: s.camera,
    })),
    "commercial"
  );

  return scenes.map((scene) => {
    const item = preview.items.find((i) => i.sceneId === scene.id);
    const recommended = plan.find((p) => p.sceneId === scene.id);
    if (!item || !recommended) {
      return scene;
    }
    return {
      ...scene,
      shotType: recommended.shotType,
      cameraMovement: recommended.cameraMovement,
      sceneEnergy: recommended.sceneEnergy,
    };
  });
}
