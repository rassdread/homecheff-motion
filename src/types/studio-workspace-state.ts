import type { StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";
import type {
  StudioAudioChangePlan,
  StudioAudioProjectAssetsRegistry,
} from "@/types/studio-audio-change-plan";

/** Server-persisted workspace state per storyboard (blob manifest). */
export type StudioWorkspaceState = {
  version: 1;
  storyboardId: string;
  ownerId: string;
  updatedAt: string;
  assetDecisionRegistry?: StudioAssetDecisionRegistry;
  /** V9 — pending audio changes (voice/music/SFX) awaiting user approval. */
  audioChangePlan?: StudioAudioChangePlan;
  /** V9 — generated/linked audio assets for this storyboard. */
  audioProjectAssets?: StudioAudioProjectAssetsRegistry;
  /** V10 — scene-level voice assignments. */
  sceneVoiceAssignments?: import("@/types/studio-v10-story-planning").StudioV10SceneVoiceAssignment[];
  /** Sanitized Motion wizard draft (URLs/IDs only — no IndexedDB blobs). */
  motionWizardDraft?: Record<string, unknown> | null;
};

export type StudioWorkspaceStatePatch = {
  assetDecisionRegistry?: StudioAssetDecisionRegistry;
  audioChangePlan?: StudioAudioChangePlan;
  audioProjectAssets?: StudioAudioProjectAssetsRegistry;
  sceneVoiceAssignments?: import("@/types/studio-v10-story-planning").StudioV10SceneVoiceAssignment[];
  motionWizardDraft?: Record<string, unknown> | null;
};

export function emptyStudioWorkspaceState(params: {
  storyboardId: string;
  ownerId: string;
}): StudioWorkspaceState {
  return {
    version: 1,
    storyboardId: params.storyboardId,
    ownerId: params.ownerId,
    updatedAt: new Date(0).toISOString(),
  };
}

export function mergeStudioWorkspaceState(
  current: StudioWorkspaceState,
  patch: StudioWorkspaceStatePatch
): StudioWorkspaceState {
  return {
    ...current,
    updatedAt: new Date().toISOString(),
    ...(patch.assetDecisionRegistry !== undefined ?
      { assetDecisionRegistry: patch.assetDecisionRegistry }
    : {}),
    ...(patch.audioChangePlan !== undefined ?
      { audioChangePlan: patch.audioChangePlan }
    : {}),
    ...(patch.audioProjectAssets !== undefined ?
      { audioProjectAssets: patch.audioProjectAssets }
    : {}),
    ...(patch.sceneVoiceAssignments !== undefined ?
      { sceneVoiceAssignments: patch.sceneVoiceAssignments }
    : {}),
    ...(patch.motionWizardDraft !== undefined ?
      { motionWizardDraft: patch.motionWizardDraft }
    : {}),
  };
}

export function parseStudioWorkspaceState(raw: unknown): StudioWorkspaceState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const storyboardId = typeof row.storyboardId === "string" ? row.storyboardId.trim() : "";
  const ownerId = typeof row.ownerId === "string" ? row.ownerId.trim() : "";
  if (!storyboardId || !ownerId || row.version !== 1) {
    return null;
  }
  return {
    version: 1,
    storyboardId,
    ownerId,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
    assetDecisionRegistry:
      row.assetDecisionRegistry && typeof row.assetDecisionRegistry === "object" ?
        (row.assetDecisionRegistry as StudioAssetDecisionRegistry)
      : undefined,
    audioChangePlan:
      row.audioChangePlan && typeof row.audioChangePlan === "object" ?
        (row.audioChangePlan as StudioAudioChangePlan)
      : undefined,
    audioProjectAssets:
      row.audioProjectAssets && typeof row.audioProjectAssets === "object" ?
        (row.audioProjectAssets as StudioAudioProjectAssetsRegistry)
      : undefined,
    sceneVoiceAssignments: Array.isArray(row.sceneVoiceAssignments)
      ? (row.sceneVoiceAssignments as import("@/types/studio-v10-story-planning").StudioV10SceneVoiceAssignment[])
      : undefined,
    motionWizardDraft:
      row.motionWizardDraft === null || row.motionWizardDraft === undefined ?
        row.motionWizardDraft === null ? null : undefined
      : typeof row.motionWizardDraft === "object" && !Array.isArray(row.motionWizardDraft) ?
        (row.motionWizardDraft as Record<string, unknown>)
      : undefined,
  };
}
