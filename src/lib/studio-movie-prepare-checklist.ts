import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  MoviePrepareChecklist,
  MoviePrepareCheckItem,
  MoviePrepareCheckLabelKey,
} from "@/types/studio-movie-builder";

function item(
  id: MoviePrepareCheckItem["id"],
  labelKey: MoviePrepareCheckLabelKey,
  passed: boolean,
  sceneIds?: string[]
): MoviePrepareCheckItem {
  return { id, labelKey, passed, sceneIds };
}

export function buildMoviePrepareChecklist(
  storyboard: StudioStoryboardDetail
): MoviePrepareChecklist {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const titleOk = storyboard.title.trim().length > 0;
  const minScenesOk = scenes.length >= 2;

  const missingLocation = scenes.filter((s) => !s.locationId).map((s) => s.id);
  const missingAction = scenes.filter((s) => !s.action.trim()).map((s) => s.id);
  const missingEmotion = scenes.filter((s) => !s.emotion.trim()).map((s) => s.id);
  const missingCamera = scenes.filter((s) => !s.camera.trim()).map((s) => s.id);
  const missingCast = scenes
    .filter((s) => s.characters.length === 0 && s.props.length === 0)
    .map((s) => s.id);

  const items: MoviePrepareCheckItem[] = [
    item("storyboard_title", "studio.movieBuilder.prepare.check.title", titleOk),
    item("min_scenes", "studio.movieBuilder.prepare.check.minScenes", minScenesOk),
    item(
      "scene_location",
      "studio.movieBuilder.prepare.check.location",
      missingLocation.length === 0,
      missingLocation
    ),
    item(
      "scene_action",
      "studio.movieBuilder.prepare.check.action",
      missingAction.length === 0,
      missingAction
    ),
    item(
      "scene_emotion",
      "studio.movieBuilder.prepare.check.emotion",
      missingEmotion.length === 0,
      missingEmotion
    ),
    item(
      "scene_camera",
      "studio.movieBuilder.prepare.check.camera",
      missingCamera.length === 0,
      missingCamera
    ),
    item(
      "scene_cast",
      "studio.movieBuilder.prepare.check.cast",
      missingCast.length === 0,
      missingCast
    ),
  ];

  const scenesNeedingAttention = new Set(
    items.flatMap((i) => i.sceneIds ?? [])
  ).size;

  return {
    ready: items.every((i) => i.passed),
    items,
    scenesNeedingAttention,
  };
}
