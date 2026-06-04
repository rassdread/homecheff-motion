import type { StoryboardVisionReport, VisionTimelineEntry } from "@/types/studio-vision-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

export function buildStoryboardVisionReport(params: {
  storyboardId: string;
  scenes: Array<{
    sceneId: string;
    sceneTitle: string;
    order: number;
    imageId: string | null;
    report: VisionConsistencyReport | null;
  }>;
}): StoryboardVisionReport {
  const timeline: VisionTimelineEntry[] = params.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    sceneTitle: scene.sceneTitle,
    order: scene.order,
    overallVisionScore: scene.report?.overallVisionScore ?? null,
    visionStatus: scene.report?.visionStatus ?? null,
    imageId: scene.imageId,
  }));

  const scored = timeline.filter((e) => e.overallVisionScore !== null);
  const overallVisionScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, e) => sum + (e.overallVisionScore ?? 0), 0) / scored.length
        )
      : 0;

  const visionWarnings = params.scenes.flatMap((s) => s.report?.visionWarnings ?? []);
  const visionRecommendations = params.scenes.flatMap(
    (s) => s.report?.visionRecommendations ?? []
  );

  return {
    storyboardId: params.storyboardId,
    analyzedAt: new Date().toISOString(),
    overallVisionScore,
    timeline,
    sceneReports: params.scenes,
    visionWarnings: [...new Set(visionWarnings)].slice(0, 20),
    visionRecommendations: [...new Set(visionRecommendations)].slice(0, 20),
  };
}
