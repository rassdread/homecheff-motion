import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioHandoffSyncFingerprint,
  compareHandoffsForRefreshAudit,
  detectStudioIntelligenceStaleness,
} from "@/lib/detect-studio-intelligence-staleness";

function sceneHandoff(overrides: Record<string, unknown> = {}) {
  return {
    sceneId: "sc-1",
    order: 0,
    title: "Scene 1",
    selectedSceneImageId: "img-a",
    selectedSceneImagePromptVersion: 1,
    selectedSceneImageGenerationVersion: 1,
    sceneVisionScore: 80,
    sceneConsistencyScore: 75,
    ...overrides,
  };
}

function handoff(scenes: unknown[], extra: Record<string, unknown> = {}) {
  return {
    version: 9,
    storyboardId: "sb-1",
    scenes,
    driftWarnings: [],
    characterDriftWarnings: [],
    visionWarnings: [],
    overallConsistencyScore: 70,
    overallVisionScore: 80,
    overallCharacterConsistencyScore: 75,
    ...extra,
  };
}

describe("detectStudioIntelligenceStaleness", () => {
  it("reports not stale when fingerprints match", () => {
    const payload = handoff([sceneHandoff()]);
    const result = detectStudioIntelligenceStaleness({
      storedHandoff: payload,
      latestHandoff: payload,
    });
    assert.equal(result.isStale, false);
    assert.equal(result.reasons.length, 0);
  });

  it("detects selected image change as high severity", () => {
    const stored = handoff([sceneHandoff({ selectedSceneImageId: "img-a" })]);
    const latest = handoff([sceneHandoff({ selectedSceneImageId: "img-b" })]);
    const result = detectStudioIntelligenceStaleness({
      storedHandoff: stored,
      latestHandoff: latest,
    });
    assert.equal(result.isStale, true);
    assert.equal(result.severity, "high");
    assert.ok(result.reasons.some((r) => r.code === "selected_image_changed"));
  });

  it("detects scene count change", () => {
    const stored = handoff([sceneHandoff()]);
    const latest = handoff([
      sceneHandoff(),
      sceneHandoff({ sceneId: "sc-2", order: 1, title: "Scene 2" }),
    ]);
    const result = detectStudioIntelligenceStaleness({
      storedHandoff: stored,
      latestHandoff: latest,
    });
    assert.equal(result.isStale, true);
    assert.ok(result.reasons.some((r) => r.code === "scene_count_changed"));
  });

  it("builds stable fingerprints", () => {
    const payload = handoff([sceneHandoff()]);
    const a = buildStudioHandoffSyncFingerprint(payload);
    const b = buildStudioHandoffSyncFingerprint(payload);
    assert.equal(a, b);
  });

  it("compareHandoffsForRefreshAudit lists image changes", () => {
    const stored = handoff([sceneHandoff({ selectedSceneImageId: "img-old" })]);
    const latest = handoff([sceneHandoff({ selectedSceneImageId: "img-new" })]);
    const audit = compareHandoffsForRefreshAudit(stored, latest as never);
    assert.ok(audit.selectedImageChanges.length >= 1);
    assert.ok(audit.staleReasons.length >= 1);
  });
});
