/**
 * Persist ephemeral workspace creative place (scene + tool + stage) for resume.
 * Not a source of truth — storyboard content remains server-owned.
 */

import type { StudioToolId } from "@/lib/studio-tool-id";
import { STUDIO_TOOL_IDS } from "@/lib/studio-tool-id";
import {
  isStudioProductionStageId,
  stageForTool,
  type StudioProductionStageId,
} from "@/lib/studio-production-stages";

const PREFIX = "hc-studio-workspace-place:";

export type StudioWorkspacePlace = {
  sceneId: string | null;
  tool: StudioToolId;
  stage?: StudioProductionStageId;
};

function storageKey(storyboardId: string): string {
  return `${PREFIX}${storyboardId}`;
}

export function readStudioWorkspacePlace(storyboardId: string): StudioWorkspacePlace | null {
  if (typeof window === "undefined" || !storyboardId.trim()) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(storyboardId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { sceneId?: unknown; tool?: unknown; stage?: unknown };
    const tool =
      typeof parsed.tool === "string" && STUDIO_TOOL_IDS.includes(parsed.tool as StudioToolId) ?
        (parsed.tool as StudioToolId)
      : null;
    if (!tool) {
      return null;
    }
    const stage =
      typeof parsed.stage === "string" && isStudioProductionStageId(parsed.stage)
        ? parsed.stage
        : stageForTool(tool);
    return {
      sceneId: typeof parsed.sceneId === "string" ? parsed.sceneId : null,
      tool,
      stage,
    };
  } catch {
    return null;
  }
}

export function writeStudioWorkspacePlace(
  storyboardId: string,
  place: StudioWorkspacePlace
): void {
  if (typeof window === "undefined" || !storyboardId.trim()) {
    return;
  }
  try {
    const stage = place.stage ?? stageForTool(place.tool);
    window.sessionStorage.setItem(
      storageKey(storyboardId),
      JSON.stringify({
        sceneId: place.sceneId,
        tool: place.tool,
        stage,
      })
    );
  } catch {
    // ignore quota / private mode
  }
}
