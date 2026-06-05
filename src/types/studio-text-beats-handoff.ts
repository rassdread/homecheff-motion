import type { SceneOverlayTemplate } from "@/lib/story-overlay-templates";

/** V46 — Studio-generated overlay text beats on handoff (Motion import defaults). */
export type MotionSceneTextBeatsHandoff = {
  headlineBeats: string[];
  titleBeats: string[];
  subtitleBeats: string[];
  heroTextBeats: string[];
  finaleTextBeats: string[];
  /** Extra narrative beat lines derived from action/description. */
  beatLines: string[];
  heroText: string;
  heroFinaleText: string;
  template: SceneOverlayTemplate;
  source: "studio_auto";
  usedFields: string[];
  ignoredFields: string[];
};

export type StudioTextBeatBuildResult = MotionSceneTextBeatsHandoff & {
  sceneId: string;
  order: number;
};
