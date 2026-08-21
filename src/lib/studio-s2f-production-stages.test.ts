/**
 * S2F — Staged production workspace model tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  defaultToolForStage,
  isStudioProductionStageId,
  resolveContinueStageLanding,
  resolveStudioProductionReadiness,
  stageForTool,
  STUDIO_PRODUCTION_STAGE_IDS,
  toolsForStage,
} from "@/lib/studio-production-stages";
import { studioSceneDetail, studioStoryboardDetail } from "@/test/studio-api-fixtures";

describe("S2F production stages", () => {
  it("keeps stable stage ids", () => {
    assert.deepEqual([...STUDIO_PRODUCTION_STAGE_IDS], [
      "story",
      "visuals",
      "entities",
      "sound",
      "finish",
    ]);
    assert.equal(isStudioProductionStageId("visuals"), true);
    assert.equal(isStudioProductionStageId("DirectorV2"), false);
  });

  it("maps tools to stages without losing tools", () => {
    assert.equal(stageForTool("story"), "story");
    assert.equal(stageForTool("visual"), "visuals");
    assert.equal(stageForTool("characters"), "entities");
    assert.equal(stageForTool("voice"), "sound");
    assert.equal(stageForTool("subtitles"), "sound");
    assert.equal(stageForTool("translate"), "sound");
    assert.equal(stageForTool("render"), "finish");
    assert.equal(stageForTool("versions"), "finish");
    assert.ok(toolsForStage("sound").includes("subtitles"));
    assert.equal(defaultToolForStage("visuals"), "visual");
  });

  it("NL/EN stage label parity", () => {
    for (const stage of STUDIO_PRODUCTION_STAGE_IDS) {
      const key = `studio.productionStage.${stage}` as keyof typeof en;
      assert.ok(en[key], key);
      assert.ok(nl[key], key);
    }
    assert.ok(en["studio.productionStage.navLabel"]);
    assert.ok(nl["studio.productionStage.navLabel"]);
    assert.equal(nl["studio.productionStage.story"], "Verhaal");
    assert.equal(en["studio.productionStage.story"], "Story");
  });

  it("empty project readiness recommends story", () => {
    const readiness = resolveStudioProductionReadiness(
      studioStoryboardDetail({ id: "empty", scenes: [] })
    );
    assert.equal(readiness.providerCalls, 0);
    assert.equal(readiness.recommendedNextStage, "story");
    assert.equal(readiness.recommendedActionCode, "ADD_FIRST_SCENE");
    assert.ok(readiness.blockingIssues.some((i) => i.code === "NO_SCENES"));
  });

  it("scenes without visuals recommend visuals stage", () => {
    const readiness = resolveStudioProductionReadiness(
      studioStoryboardDetail({
        id: "sb",
        scenes: [
          studioSceneDetail({
            id: "s1",
            order: 0,
            title: "Opening",
            action: "Walks in",
            selectedSceneImageId: null,
            sceneImages: [],
          }),
        ],
      })
    );
    assert.equal(readiness.recommendedNextStage, "visuals");
    assert.ok(readiness.blockingIssues.some((i) => i.code === "SCENE_MISSING_VISUAL"));
  });

  it("complete project recommends finish", () => {
    const readiness = resolveStudioProductionReadiness(
      studioStoryboardDetail({
        id: "done",
        voiceEnabled: false,
        musicEnabled: false,
        soundEnabled: false,
        scenes: [
          studioSceneDetail({
            id: "s1",
            order: 0,
            title: "Hero",
            action: "Product reveal",
            selectedSceneImageId: "img-1",
            sceneImages: [{ id: "img-1" } as never],
            characters: [{ id: "c1", name: "Anna" } as never],
            locationId: "loc-1",
            location: { id: "loc-1", name: "Studio" } as never,
          }),
        ],
      })
    );
    assert.equal(readiness.recommendedNextStage, "finish");
    assert.equal(readiness.overallStatus, "READY");
  });

  it("explicit stage deep-link wins continue landing", () => {
    const readiness = resolveStudioProductionReadiness(
      studioStoryboardDetail({ id: "x", scenes: [] })
    );
    assert.equal(
      resolveContinueStageLanding({
        readiness,
        explicitStage: "sound",
      }),
      "sound"
    );
  });

  it("red carpet / image origin prefers visuals when visuals incomplete", () => {
    const readiness = resolveStudioProductionReadiness(
      studioStoryboardDetail({
        id: "rc",
        scenes: [
          studioSceneDetail({
            id: "s1",
            title: "Carpet",
            action: "Pose",
            selectedSceneImageId: null,
            sceneImages: [],
          }),
        ],
      })
    );
    assert.equal(
      resolveContinueStageLanding({
        readiness,
        sourcePresetId: "red_carpet_moment",
        lifecycleClass: "QUICK_WITH_CONTINUE",
      }),
      "visuals"
    );
  });

  it("Director V2 tools map to story stage (suggestions, not primary brand)", () => {
    assert.equal(stageForTool("creativeDirector"), "story");
    assert.ok(toolsForStage("story").includes("creativeDirector"));
  });

  it("providers/render stay out of story/visual/entity primary strips", () => {
    assert.equal(toolsForStage("story").includes("render" as never), false);
    assert.equal(toolsForStage("visuals").includes("versions" as never), false);
    assert.ok(toolsForStage("finish").includes("render"));
    assert.ok(toolsForStage("finish").includes("versions"));
  });
});
