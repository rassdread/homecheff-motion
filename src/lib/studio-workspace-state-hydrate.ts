import { loadAssetDecisionRegistry, saveAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { hydrateStudioAudioWorkspaceFromServer } from "@/lib/studio-audio-change-plan-storage";
import {
  readPersistedWizardState,
  writePersistedWizardState,
  type PersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";
import { fetchStudioWorkspaceState } from "@/lib/studio-workspace-state-client";
import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";

function isNewerRegistry(
  server: StudioAssetDecisionRegistry | undefined,
  local: StudioAssetDecisionRegistry
): boolean {
  if (!server?.decisions?.length) {
    return false;
  }
  const serverAt = Date.parse(server.updatedAt);
  const localAt = Date.parse(local.updatedAt);
  if (!Number.isFinite(serverAt)) {
    return server.decisions.length > local.decisions.length;
  }
  if (!Number.isFinite(localAt)) {
    return true;
  }
  return serverAt > localAt;
}

function parseMotionWizardDraft(raw: unknown): PersistedWizardState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const parsed = raw as PersistedWizardState;
  if (parsed.version !== 1 || !Array.isArray(parsed.images)) {
    return null;
  }
  return parsed;
}

/**
 * Hydrate localStorage from server workspace state when server is newer or local is empty.
 */
export async function hydrateStudioWorkspaceStateFromServer(storyboardId: string): Promise<void> {
  if (typeof window === "undefined" || !storyboardId.trim()) {
    return;
  }

  const res = await fetchStudioWorkspaceState(storyboardId);
  if (!res.ok) {
    return;
  }

  const { state } = res.data;
  const localRegistry = loadAssetDecisionRegistry({ storyboardId });
  if (
    state.assetDecisionRegistry &&
    (localRegistry.decisions.length === 0 ||
      isNewerRegistry(state.assetDecisionRegistry, localRegistry))
  ) {
    saveAssetDecisionRegistry(
      {
        ...state.assetDecisionRegistry,
        storyboardId,
      },
      { skipServerSync: true }
    );
  }

  if (state.audioChangePlan || state.audioProjectAssets) {
    hydrateStudioAudioWorkspaceFromServer({
      storyboardId,
      audioChangePlan: state.audioChangePlan,
      audioProjectAssets: state.audioProjectAssets,
    });
  }

  const localWizard = readPersistedWizardState();
  const localStoryboardId = localWizard?.studioHandoff?.storyboardId?.trim();
  if (localStoryboardId && localStoryboardId !== storyboardId) {
    return;
  }

  const serverDraft = parseMotionWizardDraft(state.motionWizardDraft);
  if (!serverDraft) {
    return;
  }

  const serverAt = Date.parse(serverDraft.savedAt);
  const localAt = localWizard ? Date.parse(localWizard.savedAt) : Number.NaN;
  if (!localWizard || (Number.isFinite(serverAt) && serverAt > (localAt || 0))) {
    writePersistedWizardState(serverDraft, { skipServerSync: true });
  }
}
