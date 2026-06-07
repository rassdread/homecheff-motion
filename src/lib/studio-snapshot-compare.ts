/**
 * Studio V2 — Human-readable snapshot comparison (no code diff).
 */

import type {
  StudioProductionSnapshot,
  StudioSnapshotCompareLine,
  StudioSnapshotCompareResult,
} from "@/types/studio-production-snapshot";

function pushLine(
  lines: StudioSnapshotCompareLine[],
  line: StudioSnapshotCompareLine
): void {
  lines.push(line);
}

export function compareStudioSnapshots(
  from: StudioProductionSnapshot,
  to: StudioProductionSnapshot
): StudioSnapshotCompareResult {
  const lines: StudioSnapshotCompareLine[] = [];

  if (from.scenes.length !== to.scenes.length) {
    pushLine(lines, {
      id: "scene-count",
      category: "scene",
      labelKey: "studio.snapshot.compare.sceneCount",
      labelParams: {
        from: String(from.scenes.length),
        to: String(to.scenes.length),
      },
    });
  }

  const fromSceneTitles = from.scenes.map((scene) => scene.title || `#${scene.order + 1}`).join(", ");
  const toSceneTitles = to.scenes.map((scene) => scene.title || `#${scene.order + 1}`).join(", ");
  if (fromSceneTitles !== toSceneTitles) {
    pushLine(lines, {
      id: "scene-titles",
      category: "scene",
      labelKey: "studio.snapshot.compare.sceneTitles",
      labelParams: { from: fromSceneTitles || "—", to: toSceneTitles || "—" },
    });
  }

  const fromCharacters = new Set(from.scenes.flatMap((scene) => scene.characterIds));
  const toCharacters = new Set(to.scenes.flatMap((scene) => scene.characterIds));
  if (fromCharacters.size !== toCharacters.size) {
    pushLine(lines, {
      id: "asset-characters",
      category: "asset",
      labelKey: "studio.snapshot.compare.characterCount",
      labelParams: {
        from: String(fromCharacters.size),
        to: String(toCharacters.size),
      },
    });
  }

  const fromWorlds = from.identitySummaries.filter((item) => item.kind === "world").length;
  const toWorlds = to.identitySummaries.filter((item) => item.kind === "world").length;
  if (fromWorlds !== toWorlds) {
    pushLine(lines, {
      id: "asset-worlds",
      category: "asset",
      labelKey: "studio.snapshot.compare.worldCount",
      labelParams: { from: String(fromWorlds), to: String(toWorlds) },
    });
  }

  if (from.plannerSummary.estimatedDurationSeconds !== to.plannerSummary.estimatedDurationSeconds) {
    pushLine(lines, {
      id: "duration",
      category: "duration",
      labelKey: "studio.snapshot.compare.duration",
      labelParams: {
        from: String(from.plannerSummary.estimatedDurationSeconds),
        to: String(to.plannerSummary.estimatedDurationSeconds),
      },
    });
  }

  if (from.plannerSummary.estimatedShotCount !== to.plannerSummary.estimatedShotCount) {
    pushLine(lines, {
      id: "shots",
      category: "shot",
      labelKey: "studio.snapshot.compare.shots",
      labelParams: {
        from: String(from.plannerSummary.estimatedShotCount),
        to: String(to.plannerSummary.estimatedShotCount),
      },
    });
  }

  if (from.plannerSummary.renderStrategy !== to.plannerSummary.renderStrategy) {
    pushLine(lines, {
      id: "render",
      category: "render",
      labelKey: "studio.snapshot.compare.renderStrategy",
      labelParams: {
        from: from.plannerSummary.renderStrategy,
        to: to.plannerSummary.renderStrategy,
      },
    });
  }

  if (from.assetDecisionRegistry.decisions.length !== to.assetDecisionRegistry.decisions.length) {
    pushLine(lines, {
      id: "asset-decisions",
      category: "asset",
      labelKey: "studio.snapshot.compare.assetDecisions",
      labelParams: {
        from: String(from.assetDecisionRegistry.decisions.length),
        to: String(to.assetDecisionRegistry.decisions.length),
      },
    });
  }

  if (from.storyboard.aiDirectorPrompt !== to.storyboard.aiDirectorPrompt) {
    pushLine(lines, {
      id: "idea",
      category: "general",
      labelKey: "studio.snapshot.compare.ideaChanged",
      labelParams: {},
    });
  }

  return {
    fromSnapshotId: from.id,
    toSnapshotId: to.id,
    lines,
    hasChanges: lines.length > 0,
  };
}

export function compareSnapshotToCurrent(
  snapshot: StudioProductionSnapshot,
  current: StudioProductionSnapshot
): StudioSnapshotCompareResult {
  return compareStudioSnapshots(snapshot, current);
}
