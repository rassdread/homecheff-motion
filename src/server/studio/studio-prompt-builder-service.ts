import { buildScenePrompt, buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import {
  buildPromptSourceEntitiesFromSceneDetail,
  buildSceneDirectorContextLines,
  collectWorldsFromWorldProfilePicks,
  type WorldProfilePick,
} from "@/lib/studio-prompt-source-entities";
import type { StudioWorldProfileListItem } from "@/types/studio-api";
import { buildSceneMemoryBundleFromSceneRow } from "@/lib/studio-scene-memory-bundle";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import { buildSceneStillViaMatrix } from "@/lib/studio-prompt-matrix/scene-still";
import { buildProductionInstructions } from "@/lib/studio-production-prompt-orchestrator";
import { resolveUnifiedProductionContext } from "@/lib/studio-unified-production-context";
import type { ProductionInstructions, ProductionPromptTarget, UnifiedProductionContext, CompactProductionContextSnapshot } from "@/types/studio-unified-production-context";
import { compactProductionContextSnapshot } from "@/lib/studio-unified-production-context";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import {
  mapStudioSceneToDetail,
  toSceneSnapshot,
  type StudioStoryboardSceneRow,
} from "@/server/studio/studio-storyboard-service";

export { buildScenePrompt, buildScenePromptFromInput };

function buildPromptSourceEntitiesFromSceneRow(
  row: StudioStoryboardSceneRow
): ReturnType<typeof buildPromptSourceEntitiesFromSceneDetail> {
  const sceneDetail = mapStudioSceneToDetail(row);
  const worldPicks: Array<WorldProfilePick | null | undefined> = [];
  for (const link of row.characters) {
    worldPicks.push(link.character.worldProfile as WorldProfilePick | null);
  }
  if (row.location) {
    worldPicks.push(row.location.worldProfile as WorldProfilePick | null);
  }
  for (const link of row.props) {
    worldPicks.push(link.prop.worldProfile as WorldProfilePick | null);
  }
  return buildPromptSourceEntitiesFromSceneDetail(sceneDetail, collectWorldsFromWorldProfilePicks(worldPicks));
}

/** Unified production prompt path — same sourceEntities + director context as preview.
 * S.6E: ContinuityBundle → Prompt Matrix → existing builder (output remains builder-equivalent).
 */
export function buildScenePromptFromSceneRow(
  row: StudioStoryboardSceneRow,
  styleProfile?: StudioPromptStyleProfile | string,
  directorProfile?: string,
  options?: { storyboard?: StudioStoryboardDetail }
): PromptBuilderOutput {
  const sceneDetail = mapStudioSceneToDetail(row);
  const sourceEntities = buildPromptSourceEntitiesFromSceneRow(row);
  const directorContextLines = buildSceneDirectorContextLines(sceneDetail, sourceEntities, {
    storyboard: options?.storyboard,
  });

  const input = studioSceneDetailToPromptInput(sceneDetail, styleProfile, directorProfile, {
    sourceEntities,
    directorContextLines,
  });

  return buildSceneStillViaMatrix(input, {
    durationSeconds: sceneDetail.durationSeconds ?? null,
    storyboardId: options?.storyboard?.id ?? null,
    storyboardTitle: options?.storyboard?.title ?? null,
  }).builderOutput;
}

export function buildScenePromptForDetail(
  scene: StudioSceneDetail,
  styleProfile?: StudioPromptStyleProfile | string,
  options?: {
    sourceEntities?: ReturnType<typeof buildPromptSourceEntitiesFromSceneDetail>;
    worlds?: StudioWorldProfileListItem[];
    storyboard?: StudioStoryboardDetail;
  }
): PromptBuilderOutput {
  const sourceEntities =
    options?.sourceEntities ??
    buildPromptSourceEntitiesFromSceneDetail(scene, options?.worlds ?? []);
  const directorContextLines = buildSceneDirectorContextLines(scene, sourceEntities, {
    storyboard: options?.storyboard,
  });
  const input = studioSceneDetailToPromptInput(scene, styleProfile, undefined, {
    sourceEntities,
    directorContextLines,
  });
  return buildSceneStillViaMatrix(input, {
    durationSeconds: scene.durationSeconds ?? null,
    storyboardId: options?.storyboard?.id ?? null,
    storyboardTitle: options?.storyboard?.title ?? null,
  }).builderOutput;
}

export function buildUpcFromStoryboardDetail(
  storyboard: StudioStoryboardDetail,
  options?: {
    source?: UnifiedProductionContext["source"];
    experienceId?: string | null;
    worlds?: StudioWorldProfileListItem[];
    worldPicks?: WorldProfilePick[];
  }
): UnifiedProductionContext {
  return resolveUnifiedProductionContext({
    storyboard,
    worlds: options?.worlds,
    worldPicks: options?.worldPicks,
    source: options?.source ?? "workspace",
    experienceId: options?.experienceId ?? null,
  });
}

export function buildProductionInstructionsForScene(params: {
  upc: UnifiedProductionContext;
  scene: StudioSceneDetail;
  target: ProductionPromptTarget;
  identityDriftLines?: string[];
  storyboard?: StudioStoryboardDetail;
}): ProductionInstructions {
  const builderOutput = buildScenePromptForDetail(params.scene, params.upc.style.storyboardStyleProfile, {
    storyboard: params.storyboard,
  });
  return buildProductionInstructions({
    upc: params.upc,
    sceneId: params.scene.id,
    target: params.target,
    builderOutput,
    identityDriftLines: params.identityDriftLines,
  });
}

export function applyUpcExecutionToHandoff(
  payload: MotionHandoffPayload,
  storyboard: StudioStoryboardDetail,
  options?: { source?: UnifiedProductionContext["source"] }
): MotionHandoffPayload {
  const upc = buildUpcFromStoryboardDetail(storyboard, { source: options?.source ?? "workspace" });
  const snapshot: CompactProductionContextSnapshot = compactProductionContextSnapshot(upc);
  const scenes = payload.scenes.map((scene) => {
    const detail = storyboard.scenes.find((row) => row.id === scene.sceneId);
    if (!detail) {
      return scene;
    }
    try {
      const instructions = buildProductionInstructionsForScene({
        upc,
        scene: detail,
        target: "motion",
        storyboard,
      });
      return {
        ...scene,
        executionPrompt: instructions.assembledPrompt,
        productionSceneContextHash: instructions.sceneContextHash,
      };
    } catch {
      return scene;
    }
  });
  return {
    ...payload,
    productionContext: snapshot,
    scenes,
  };
}

export function buildScenePromptForSnapshot(
  scene: SceneSnapshot,
  styleProfile?: StudioPromptStyleProfile | string
): PromptBuilderOutput {
  return buildScenePrompt(scene, styleProfile);
}

/** Legacy path without scene detail — memory bundle only. */
export function buildScenePromptFromSceneRowLegacy(
  row: StudioStoryboardSceneRow,
  styleProfile?: StudioPromptStyleProfile | string,
  directorProfile?: string
): PromptBuilderOutput {
  const snapshot = toSceneSnapshot(row);
  const memoryBundle = buildSceneMemoryBundleFromSceneRow({
    characters: row.characters,
    location: row.location,
    props: row.props,
  });
  return buildScenePrompt(snapshot, styleProfile, memoryBundle, {
    directorProfile,
    shotType: row.shotType,
    cameraMovement: row.cameraMovement,
    sceneEnergy: row.sceneEnergy,
  });
}
