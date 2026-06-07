/**
 * Studio V2 — Snapshot context for AI Director and Creation Assistant.
 */

import { findLastSafeRecoveryPoint } from "@/lib/studio-snapshot-recovery";
import { listStudioSnapshots, loadSnapshotHistory } from "@/lib/studio-snapshot-storage";
import type {
  StudioProductionSnapshot,
  StudioSnapshotContext,
} from "@/types/studio-production-snapshot";
import type { ProductionTimelineEvent } from "@/types/studio-production-timeline";

export function buildSnapshotTimelineEvents(
  storyboardId: string
): ProductionTimelineEvent[] {
  const history = loadSnapshotHistory(storyboardId);
  return history.entries.map((entry) => ({
    id: entry.id,
    at: entry.at,
    kind: entry.kind === "snapshot_created" ? "snapshot_created" : "snapshot_restored",
    source: "derived" as const,
    category: "evolution" as const,
    titleKey:
      entry.kind === "snapshot_created"
        ? "studio.productionTimeline.event.snapshotCreated"
        : "studio.productionTimeline.event.snapshotRestored",
    titleParams: entry.labelParams,
    toolId: "versions" as const,
  }));
}

export function buildStudioSnapshotContext(params: {
  storyboardId: string;
  storyboardUpdatedAt?: string;
}): StudioSnapshotContext {
  const snapshots = listStudioSnapshots(params.storyboardId);
  const latestSnapshot: StudioProductionSnapshot | null = snapshots[0] ?? null;
  const recoveryPoint = findLastSafeRecoveryPoint(params.storyboardId, params.storyboardUpdatedAt);

  const contextLines: string[] = [];
  const recommendationKeys: string[] = [];

  if (latestSnapshot) {
    contextLines.push(
      `snapshot:latest:${latestSnapshot.id}`,
      `snapshot:scenes:${latestSnapshot.scenes.length}`,
      `snapshot:duration:${latestSnapshot.plannerSummary.estimatedDurationSeconds}s`,
      `snapshot:shots:${latestSnapshot.plannerSummary.estimatedShotCount}`
    );
    if (recoveryPoint && !recoveryPoint.isStale) {
      contextLines.push(`snapshot:recovery:${recoveryPoint.snapshotId}`);
    }
  }

  if (snapshots.length >= 2) {
    const previous = snapshots[1]!;
    if (previous.scenes.length !== (latestSnapshot?.scenes.length ?? 0)) {
      contextLines.push(
        `snapshot:previousScenes:${previous.scenes.length}`,
        `snapshot:currentScenes:${latestSnapshot?.scenes.length ?? 0}`
      );
      recommendationKeys.push("studio.snapshot.director.previousSceneCount");
    }
  }

  if (recoveryPoint) {
    recommendationKeys.push("studio.snapshot.recovery.available");
  }

  return {
    latestSnapshot,
    recoveryPoint,
    contextLines,
    recommendationKeys: recommendationKeys.slice(0, 4),
  };
}

export function enrichIdeaWithStudioSnapshot(idea: string, context: StudioSnapshotContext): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const previousSceneLine = context.contextLines.find((line) => line.startsWith("snapshot:previousScenes:"));
  const hint =
    previousSceneLine ?
      `Earlier snapshot had ${previousSceneLine.split(":")[2]} scenes.`
    : "";
  const lines = [...context.contextLines, hint].filter(Boolean).join("; ");
  return `[Snapshot context: ${lines}]\n${idea.trim()}`.trim();
}
