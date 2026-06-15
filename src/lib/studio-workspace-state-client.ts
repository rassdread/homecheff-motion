import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";
import type {
  StudioAudioChangePlan,
  StudioAudioProjectAssetsRegistry,
} from "@/types/studio-audio-change-plan";
import type { StudioWorkspaceState } from "@/types/studio-workspace-state";

export async function fetchStudioWorkspaceState(storyboardId: string) {
  return fetchSameOriginJson<{ ok: true; state: StudioWorkspaceState }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/workspace-state`
    )
  );
}

export async function saveStudioWorkspaceState(
  storyboardId: string,
  patch: {
    assetDecisionRegistry?: StudioAssetDecisionRegistry;
    audioChangePlan?: StudioAudioChangePlan;
    audioProjectAssets?: StudioAudioProjectAssetsRegistry;
    motionWizardDraft?: Record<string, unknown> | null;
  }
) {
  return fetchSameOriginJson<{ ok: true; state: StudioWorkspaceState }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/workspace-state`
    ),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
}

/** Debounced server sync — fire-and-forget; localStorage remains the fast path. */
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleStudioWorkspaceStateSync(
  storyboardId: string,
  patch: {
    assetDecisionRegistry?: StudioAssetDecisionRegistry;
    audioChangePlan?: StudioAudioChangePlan;
    audioProjectAssets?: StudioAudioProjectAssetsRegistry;
    motionWizardDraft?: Record<string, unknown> | null;
  }
): void {
  if (typeof window === "undefined" || !storyboardId.trim()) {
    return;
  }
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void saveStudioWorkspaceState(storyboardId, patch);
  }, 800);
}
