/**
 * Studio V2 — Snapshot recovery (manual restore only; no auto-restore).
 */

import { saveAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { buildStudioSnapshot } from "@/lib/studio-snapshot-builder";
import {
  appendSnapshotHistoryEntry,
  findStudioSnapshot,
  loadSnapshotHistory,
} from "@/lib/studio-snapshot-storage";
import { updateStudioSceneApi, updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  BuildStudioSnapshotInput,
  StudioProductionSnapshot,
  StudioSnapshotRecoveryPoint,
  StudioSnapshotRestoreResult,
} from "@/types/studio-production-snapshot";

export function findLastSafeRecoveryPoint(
  storyboardId: string,
  currentUpdatedAt?: string
): StudioSnapshotRecoveryPoint | null {
  const history = loadSnapshotHistory(storyboardId);
  const latest = history.snapshots[0];
  if (!latest) {
    return null;
  }

  return {
    snapshotId: latest.id,
    savedAt: latest.savedAt,
    labelKey: latest.labelKey,
    labelParams: latest.labelParams,
    sceneCount: latest.scenes.length,
    isStale: Boolean(currentUpdatedAt && latest.storyboardUpdatedAt !== currentUpdatedAt),
  };
}

export function restoreSnapshotAssetDecisions(snapshot: StudioProductionSnapshot): void {
  saveAssetDecisionRegistry({
    ...snapshot.assetDecisionRegistry,
    storyboardId: snapshot.storyboardId,
    updatedAt: new Date().toISOString(),
  });
}

export async function restoreStudioSnapshot(params: {
  storyboardId: string;
  snapshotId: string;
  currentStoryboard: StudioStoryboardDetail;
  snapshotInput: Omit<BuildStudioSnapshotInput, "storyboard">;
}): Promise<StudioSnapshotRestoreResult> {
  const snapshot = findStudioSnapshot(params.storyboardId, params.snapshotId);
  if (!snapshot) {
    return {
      ok: false,
      snapshotId: params.snapshotId,
      restoredAt: new Date().toISOString(),
      restoredAssetDecisions: false,
      storyboardFieldsRestored: [],
      scenesRestored: 0,
      errorKey: "studio.snapshot.restore.notFound",
    };
  }

  const restoredAt = new Date().toISOString();
  const storyboardFieldsRestored: string[] = [];

  try {
    await updateStudioStoryboardApi(params.storyboardId, {
      title: snapshot.storyboard.title,
      description: snapshot.storyboard.description,
      aiDirectorPrompt: snapshot.storyboard.aiDirectorPrompt,
      promptStyleProfile: snapshot.storyboard.promptStyleProfile,
      directorProfile: snapshot.storyboard.directorProfile,
      aiDirectorStyleStrength: snapshot.storyboard.aiDirectorStyleStrength,
      voiceEnabled: snapshot.storyboard.voiceEnabled,
      voiceLanguage: snapshot.storyboard.voiceLanguage,
      voiceProfile: snapshot.storyboard.voiceProfile,
      narrationMode: snapshot.storyboard.narrationMode,
      musicEnabled: snapshot.storyboard.musicEnabled,
      musicStyle: snapshot.storyboard.musicStyle,
      soundEnabled: snapshot.storyboard.soundEnabled,
      soundStyle: snapshot.storyboard.soundStyle,
    });
    storyboardFieldsRestored.push("storyboard");
  } catch {
    return {
      ok: false,
      snapshotId: snapshot.id,
      restoredAt,
      restoredAssetDecisions: false,
      storyboardFieldsRestored: [],
      scenesRestored: 0,
      errorKey: "studio.snapshot.restore.storyboardFailed",
    };
  }

  let scenesRestored = 0;
  const currentSceneIds = new Set((params.currentStoryboard.scenes ?? []).map((scene) => scene.id));
  for (const scene of snapshot.scenes) {
    if (!currentSceneIds.has(scene.id)) {
      continue;
    }
    try {
      await updateStudioSceneApi(params.storyboardId, scene.id, {
        title: scene.title,
        description: scene.description,
        action: scene.action,
        emotion: scene.emotion,
        durationSeconds: scene.durationSeconds,
        shotType: scene.shotType,
        cameraMovement: scene.cameraMovement,
        sceneEnergy: scene.sceneEnergy,
        locationId: scene.locationId,
        characterIds: scene.characterIds,
        propIds: scene.propIds,
      });
      scenesRestored += 1;
    } catch {
      /* continue restoring other scenes */
    }
  }

  restoreSnapshotAssetDecisions(snapshot);

  appendSnapshotHistoryEntry(params.storyboardId, {
    id: `entry-restore-${snapshot.id}-${Date.now()}`,
    at: restoredAt,
    kind: "snapshot_restored",
    snapshotId: snapshot.id,
    labelKey: snapshot.labelKey,
    labelParams: snapshot.labelParams,
  });

  return {
    ok: true,
    snapshotId: snapshot.id,
    restoredAt,
    restoredAssetDecisions: true,
    storyboardFieldsRestored,
    scenesRestored,
  };
}

export function buildCurrentSnapshotFingerprint(
  input: BuildStudioSnapshotInput
): StudioProductionSnapshot {
  return buildStudioSnapshot({ ...input, source: "checkpoint" });
}
