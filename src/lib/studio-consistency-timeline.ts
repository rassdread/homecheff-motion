import type {
  ConsistencyTimelineEntry,
  SceneConsistencyReport,
  StoryboardConsistencyReport,
} from "@/types/studio-consistency";

export function buildConsistencyTimeline(
  scenes: Array<{
    sceneId: string;
    sceneTitle: string;
    order: number;
    imageId: string | null;
    report: SceneConsistencyReport | null;
  }>
): ConsistencyTimelineEntry[] {
  return [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => ({
      sceneId: scene.sceneId,
      sceneTitle: scene.sceneTitle,
      order: scene.order,
      overallScore: scene.report?.overallScore ?? null,
      consistencyStatus: scene.report?.consistencyStatus ?? null,
      imageId: scene.imageId,
    }));
}

export function buildStoryboardConsistencyReport(params: {
  storyboardId: string;
  scenes: Array<{
    sceneId: string;
    sceneTitle: string;
    order: number;
    imageId: string | null;
    report: SceneConsistencyReport | null;
  }>;
}): StoryboardConsistencyReport {
  const timeline = buildConsistencyTimeline(params.scenes);
  const scored = params.scenes
    .map((s) => s.report?.overallScore)
    .filter((s): s is number => typeof s === "number");
  const overallScore =
    scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      : 0;

  const driftWarnings = [
    ...new Set(params.scenes.flatMap((s) => s.report?.analysis.driftWarnings ?? [])),
  ];
  const recommendations = [
    ...new Set(params.scenes.flatMap((s) => s.report?.recommendations ?? [])),
  ];

  return {
    storyboardId: params.storyboardId,
    analyzedAt: new Date().toISOString(),
    overallScore,
    timeline,
    sceneReports: params.scenes,
    driftWarnings,
    recommendations,
  };
}
