import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildProductionTimeline } from "@/lib/studio-production-timeline";
import { buildStudioSnapshot } from "@/lib/studio-snapshot-builder";
import { compareStudioSnapshots } from "@/lib/studio-snapshot-compare";
import {
  buildSnapshotTimelineEvents,
  buildStudioSnapshotContext,
  enrichIdeaWithStudioSnapshot,
} from "@/lib/studio-snapshot-context";
import { findLastSafeRecoveryPoint } from "@/lib/studio-snapshot-recovery";
import {
  clearSnapshotStorageForTests,
  listStudioSnapshots,
  saveStudioSnapshot,
} from "@/lib/studio-snapshot-storage";
import { emptyAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";

describe("studio-snapshot-foundation", () => {
  beforeEach(() => {
    clearSnapshotStorageForTests();
  });

  it("builds production configuration snapshot", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-snap",
      title: "Garden promo",
      aiDirectorPrompt: "HomeCheff garden harvest",
      scenes: [
        studioSceneDetail({ order: 0, title: "Opening", durationSeconds: 10 }),
        studioSceneDetail({ order: 1, title: "Harvest", durationSeconds: 12 }),
      ],
    });

    const snapshot = buildStudioSnapshot({
      storyboard,
      assetDecisionRegistry: emptyAssetDecisionRegistry({ storyboardId: "sb-snap" }),
    });

    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.storyboardId, "sb-snap");
    assert.equal(snapshot.scenes.length, 2);
    assert.equal(snapshot.storyboard.aiDirectorPrompt, "HomeCheff garden harvest");
    assert.ok(snapshot.plannerSummary.estimatedDurationSeconds >= 0);
    assert.ok(snapshot.creationAssistantSummary.totalCount >= 0);
  });

  it("saves and lists snapshots in storage", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-store", scenes: [] });
    const snapshot = buildStudioSnapshot({ storyboard });
    saveStudioSnapshot(snapshot);

    const listed = listStudioSnapshots("sb-store");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]!.id, snapshot.id);
  });

  it("compares snapshots with human-readable lines", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-cmp", scenes: [] });
    const older = buildStudioSnapshot({
      storyboard: studioStoryboardDetail({
        id: "sb-cmp",
        scenes: [studioSceneDetail({ order: 0, title: "A" })],
      }),
    });
    const newer = buildStudioSnapshot({
      storyboard: studioStoryboardDetail({
        id: "sb-cmp",
        scenes: [
          studioSceneDetail({ order: 0, title: "A" }),
          studioSceneDetail({ order: 1, title: "B" }),
        ],
      }),
    });

    const compare = compareStudioSnapshots(older, newer);
    assert.ok(compare.hasChanges);
    assert.ok(compare.lines.some((line) => line.id === "scene-count"));
  });

  it("builds snapshot timeline events", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-tl", scenes: [] });
    const snapshot = buildStudioSnapshot({ storyboard });
    saveStudioSnapshot(snapshot);

    const events = buildSnapshotTimelineEvents("sb-tl");
    assert.ok(events.some((event) => event.kind === "snapshot_created"));
  });

  it("integrates snapshot events into production timeline", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-tl2", scenes: [] });
    saveStudioSnapshot(buildStudioSnapshot({ storyboard }));

    const timeline = buildProductionTimeline({
      storyboard,
      snapshotTimelineEvents: buildSnapshotTimelineEvents("sb-tl2"),
    });
    assert.ok(timeline.timelineEvents.some((event) => event.kind === "snapshot_created"));
  });

  it("finds last safe recovery point", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-rec",
      updatedAt: "2026-01-01T10:00:00.000Z",
      scenes: [studioSceneDetail({ order: 0 })],
    });
    saveStudioSnapshot(buildStudioSnapshot({ storyboard }));

    const point = findLastSafeRecoveryPoint("sb-rec", storyboard.updatedAt);
    assert.ok(point);
    assert.equal(point!.sceneCount, 1);
    assert.equal(point!.isStale, false);
  });

  it("marks recovery point stale when storyboard updated", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-stale",
      updatedAt: "2026-01-01T10:00:00.000Z",
      scenes: [],
    });
    saveStudioSnapshot(buildStudioSnapshot({ storyboard }));

    const point = findLastSafeRecoveryPoint("sb-stale", "2026-01-02T10:00:00.000Z");
    assert.ok(point?.isStale);
  });

  it("Creation Assistant exposes recovery point", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-ca",
      scenes: [studioSceneDetail({ order: 0 })],
    });
    saveStudioSnapshot(buildStudioSnapshot({ storyboard }));

    const view = buildCreationAssistantView({ storyboard });
    assert.ok(view.recoveryPoint);
    assert.equal(view.recoveryPoint!.sceneCount, 1);
  });

  it("builds snapshot context for AI Director", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-dir",
      scenes: [studioSceneDetail({ order: 0 })],
    });
    saveStudioSnapshot(buildStudioSnapshot({ storyboard }));
    saveStudioSnapshot(
      buildStudioSnapshot({
        storyboard: studioStoryboardDetail({
          id: "sb-dir",
          scenes: [studioSceneDetail({ order: 0 }), studioSceneDetail({ order: 1 })],
        }),
      })
    );

    const context = buildStudioSnapshotContext({
      storyboardId: "sb-dir",
      storyboardUpdatedAt: storyboard.updatedAt,
    });
    assert.ok(context.latestSnapshot);
    assert.ok(context.contextLines.some((line) => line.startsWith("snapshot:")));
  });

  it("enriches idea with snapshot context", () => {
    const context = buildStudioSnapshotContext({ storyboardId: "empty" });
    const enriched = enrichIdeaWithStudioSnapshot("Promo idea", {
      ...context,
      contextLines: ["snapshot:scenes:5"],
    });
    assert.ok(enriched.includes("[Snapshot context:"));
  });

  it("AI Director consumes snapshotContext", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-prop",
      scenes: [],
      aiDirectorPrompt: "Garden promo",
    });
    saveStudioSnapshot(buildStudioSnapshot({ storyboard }));

    const proposal = buildDirectorProposal({
      idea: "Garden promo",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal?.snapshotContext);
  });
});
