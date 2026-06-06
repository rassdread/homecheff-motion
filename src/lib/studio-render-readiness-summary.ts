/**
 * Render Readiness — simplified pre-handoff checklist.
 */

import { buildStudioTextBeats, studioSceneDetailToBeatSource } from "@/lib/build-studio-text-beats";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type RenderReadinessLevel = "ready" | "almost_ready" | "needs_work";

export type RenderReadinessCheck = {
  id: "scenes" | "images" | "voice" | "text_beats" | "emotion";
  messageKey: string;
  passed: boolean;
};

export type RenderReadinessSummary = {
  score: number;
  level: RenderReadinessLevel;
  checks: RenderReadinessCheck[];
};

export function buildRenderReadinessSummary(
  storyboard: StudioStoryboardDetail
): RenderReadinessSummary {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const sceneCount = scenes.length;
  const imagesOk =
    sceneCount > 0 &&
    scenes.every((s) => sceneHasCompletedImage(s));
  const voiceOk =
    !storyboard.voiceEnabled ||
    Boolean(storyboard.voiceProfile?.trim() || storyboard.voiceNarrationScript?.trim());
  let textBeatsOk = true;
  let emotionOk = true;
  if (sceneCount > 0) {
    textBeatsOk = scenes.some((scene, index) => {
      const beats = buildStudioTextBeats({
        scene: studioSceneDetailToBeatSource(scene),
        sceneIndex: index,
        sceneCount,
        storyboardTitle: storyboard.title,
        storyboardDescription: storyboard.description,
        aiDirectorNotes: storyboard.aiDirectorPrompt,
      });
      return beats.beatLines.length > 0 || beats.headlineBeats.length > 0;
    });
    emotionOk = scenes.filter((s) => s.emotion?.trim()).length >= Math.ceil(sceneCount * 0.6);
  }

  const checks: RenderReadinessCheck[] = [
    {
      id: "scenes",
      messageKey: "studio.aiAssistant.readiness.check.scenes",
      passed: sceneCount >= 2,
    },
    {
      id: "images",
      messageKey: "studio.aiAssistant.readiness.check.images",
      passed: imagesOk,
    },
    {
      id: "voice",
      messageKey: "studio.aiAssistant.readiness.check.voice",
      passed: voiceOk,
    },
    {
      id: "text_beats",
      messageKey: "studio.aiAssistant.readiness.check.textBeats",
      passed: textBeatsOk,
    },
    {
      id: "emotion",
      messageKey: "studio.aiAssistant.readiness.check.emotion",
      passed: emotionOk,
    },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const level: RenderReadinessLevel =
    score >= 90 ? "ready"
    : score >= 60 ? "almost_ready"
    : "needs_work";

  return { score, level, checks };
}
