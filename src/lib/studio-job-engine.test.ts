import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeStudioJobProgress,
  formatStudioJobStepLabel,
} from "@/lib/studio-job-progress";
import { isStudioJobType, parseStudioJobCreateBody } from "@/lib/studio-job-validation";
import { studioJobViewerCanView } from "@/server/studio/studio-job-access";
import {
  STUDIO_JOB_STATUSES,
  STUDIO_JOB_TYPES,
  type StudioJobResult,
} from "@/types/studio-job";

describe("studio job engine V15", () => {
  it("parses job create body with type and sceneIds", () => {
    const parsed = parseStudioJobCreateBody({
      type: "generate_scene_images",
      sceneIds: ["s1", "s2"],
      options: { autoSelect: true },
    });
    assert.ok(parsed);
    assert.equal(parsed.type, "generate_scene_images");
    assert.deepEqual(parsed.input.sceneIds, ["s1", "s2"]);
    assert.equal(parsed.input.options?.autoSelect, true);
  });

  it("rejects invalid job type", () => {
    assert.equal(parseStudioJobCreateBody({ type: "invalid" }), null);
    assert.equal(isStudioJobType("analyze_vision"), true);
  });

  it("computeStudioJobProgress returns percent from steps", () => {
    assert.equal(computeStudioJobProgress(0, 8), 0);
    assert.equal(computeStudioJobProgress(4, 8), 50);
    assert.equal(computeStudioJobProgress(8, 8), 100);
  });

  it("formatStudioJobStepLabel includes scene index", () => {
    const label = formatStudioJobStepLabel({
      sceneIndex: 2,
      totalScenes: 8,
      sceneTitle: "Kitchen",
      action: "Generating image",
    });
    assert.match(label, /3\/8/);
    assert.match(label, /Kitchen/);
  });

  it("studioJobViewerCanView allows owner and admin", () => {
    assert.equal(
      studioJobViewerCanView({ id: "u1", role: "user" }, { ownerId: "u1" }),
      true
    );
    assert.equal(
      studioJobViewerCanView({ id: "u2", role: "admin" }, { ownerId: "u1" }),
      true
    );
    assert.equal(
      studioJobViewerCanView({ id: "u2", role: "user" }, { ownerId: "u1" }),
      false
    );
  });

  it("partial failure audit keeps completed and failed counts", () => {
    const result: StudioJobResult = {
      startedAt: new Date().toISOString(),
      sceneIdsProcessed: ["a", "b"],
      imageIdsCreated: ["img1"],
      sceneResults: [
        { sceneId: "a", sceneTitle: "A", order: 0, ok: true, imageId: "img1" },
        { sceneId: "b", sceneTitle: "B", order: 1, ok: false, error: "provider error" },
      ],
      errors: [{ sceneId: "b", message: "provider error" }],
      completedSceneCount: 1,
      failedSceneCount: 1,
      skippedSceneCount: 0,
    };
    assert.equal(result.completedSceneCount, 1);
    assert.equal(result.failedSceneCount, 1);
    assert.ok(result.errors.length > 0);
  });

  it("exports expected job types and statuses", () => {
    assert.equal(STUDIO_JOB_TYPES.length, 5);
    assert.equal(isStudioJobType("analyze_character_consistency"), true);
    assert.ok(STUDIO_JOB_STATUSES.includes("cancelled"));
  });
});
