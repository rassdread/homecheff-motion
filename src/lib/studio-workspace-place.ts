/**
 * Persist ephemeral workspace creative place (scene + tool) for resume.
 * Not a source of truth — storyboard content remains server-owned.
 */

import type { StudioToolId } from "@/lib/studio-tool-id";
import { STUDIO_TOOL_IDS } from "@/lib/studio-tool-id";

const PREFIX = "hc-studio-workspace-place:";

export type StudioWorkspacePlace = {
  sceneId: string | null;
  tool: StudioToolId;
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
    const parsed = JSON.parse(raw) as { sceneId?: unknown; tool?: unknown };
    const tool =
      typeof parsed.tool === "string" && STUDIO_TOOL_IDS.includes(parsed.tool as StudioToolId) ?
        (parsed.tool as StudioToolId)
      : null;
    if (!tool) {
      return null;
    }
    return {
      sceneId: typeof parsed.sceneId === "string" ? parsed.sceneId : null,
      tool,
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
    window.sessionStorage.setItem(storageKey(storyboardId), JSON.stringify(place));
  } catch {
    // ignore quota / private mode
  }
}
