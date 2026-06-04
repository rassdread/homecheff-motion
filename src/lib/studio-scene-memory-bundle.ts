import { buildSceneMemoryBundle } from "@/lib/studio-memory-mappers";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

/** Minimal scene row shape for memory bundle + prompt building. */
export type StudioSceneRowWithMemoryLike = {
  characters: Array<{ character: Parameters<typeof buildSceneMemoryBundle>[0]["characters"][number] }>;
  location: Parameters<typeof buildSceneMemoryBundle>[0]["location"];
  props: Array<{ prop: Parameters<typeof buildSceneMemoryBundle>[0]["props"][number] }>;
  sceneImages?: unknown[];
};

export function buildSceneMemoryBundleFromSceneRow(
  row: StudioSceneRowWithMemoryLike
): SceneMemoryBundle {
  return buildSceneMemoryBundle({
    characters: row.characters.map((link) => link.character),
    location: row.location,
    props: row.props.map((link) => link.prop),
  });
}
