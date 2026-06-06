import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSceneImageReadiness,
  buildVisualProductionSummary,
  enrichVisualProductionSummary,
  findSceneVisualPlan,
} from "@/lib/studio-visual-production-summary";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { StudioSceneDetail } from "@/types/studio-api";

function character(id: string, name: string) {
  return studioCharacterListItem({ id, name });
}

function location(id: string, name: string) {
  return studioLocationListItem({ id, name, description: `${name} interior` });
}

function scene(partial: Partial<StudioSceneDetail> & { order: number }) {
  return studioSceneDetail(partial);
}

describe("studio-visual-production-summary", () => {
  it("buildVisualProductionSummary counts image and asset gaps on empty storyboard", () => {
    const summary = buildVisualProductionSummary(studioStoryboardDetail({ scenes: [] }));
    assert.equal(summary.sceneCount, 0);
    assert.equal(summary.scenesWithImage, 0);
    assert.equal(summary.scenesWithoutImage, 0);
    assert.equal(summary.scenesMissingLocation, 0);
    assert.equal(summary.scenesMissingCharacters, 0);
  });

  it("buildVisualProductionSummary tracks scenes with and without images", () => {
    const sb = studioStoryboardDetail({
      scenes: [
        scene({
          order: 0,
          id: "s1",
          characters: [character("c1", "Sergio")],
          location: location("l1", "Office"),
          sceneImages: [
            studioSceneImageListItem({ id: "img1", sceneId: "s1", status: "completed" }),
          ],
        }),
        scene({
          order: 1,
          id: "s2",
          characters: [],
          location: null,
          sceneImages: [],
        }),
      ],
    });
    const summary = buildVisualProductionSummary(sb);
    assert.equal(summary.sceneCount, 2);
    assert.equal(summary.scenesWithImage, 1);
    assert.equal(summary.scenesWithoutImage, 1);
    assert.equal(summary.scenesMissingLocation, 1);
    assert.equal(summary.scenesMissingCharacters, 1);
  });

  it("enrichVisualProductionSummary adds visual consistency score from planner", () => {
    const sb = studioStoryboardDetail({
      scenes: [
        scene({
          order: 0,
          id: "s1",
          description: "Sergio welcomes the team",
          characters: [character("c1", "Sergio")],
          location: location("l1", "Modern office"),
          shotType: "medium_wide",
          emotion: "optimistic",
        }),
      ],
    });
    const base = buildVisualProductionSummary(sb);
    const enriched = enrichVisualProductionSummary(base, sb);
    assert.ok(enriched.visualConsistencyScore > 0);
  });

  it("findSceneVisualPlan returns image prompt exports for active scene", () => {
    const sb = studioStoryboardDetail({
      scenes: [
        scene({
          order: 0,
          id: "s1",
          description: "Chef presents the dish",
          characters: [character("c1", "Chef")],
          location: location("l1", "Kitchen"),
          shotType: "close_up",
          emotion: "proud",
        }),
      ],
    });
    const plan = findSceneVisualPlan(sb, "s1");
    assert.ok(plan);
    assert.equal(plan.requirements.sceneId, "s1");
    assert.ok(plan.exports.imageGenerationPrompt.length > 20);
    assert.match(plan.requirements.characterNames.join(" "), /Chef/);
  });

  it("buildSceneImageReadiness marks needs_work when storyboard lacks basics", () => {
    const readiness = buildSceneImageReadiness({
      storyboard: studioStoryboardDetail({
        scenes: [scene({ order: 0, id: "s1" })],
      }),
    });
    assert.equal(readiness.level, "needs_work");
    assert.ok(readiness.score < 50);
    assert.ok(readiness.recommendationKeys.includes("studio.visualProduction.rec.characters"));
    assert.ok(readiness.recommendationKeys.includes("studio.visualProduction.rec.location"));
  });

  it("buildSceneImageReadiness reaches ready when scenes are fully prepared", () => {
    const scenes = Array.from({ length: 2 }, (_, i) =>
      scene({
        order: i,
        id: `s${i + 1}`,
        description: "Team collaborates in the office",
        characters: [character("c1", "Sergio")],
        location: location("l1", "Office"),
        shotType: "medium_wide",
        emotion: "focused",
        sceneImages: [
          studioSceneImageListItem({
            id: `img${i + 1}`,
            sceneId: `s${i + 1}`,
            status: "completed",
          }),
        ],
      })
    );
    const readiness = buildSceneImageReadiness({
      storyboard: studioStoryboardDetail({ scenes }),
    });
    assert.equal(readiness.level, "ready");
    assert.equal(readiness.score, 100);
    assert.ok(readiness.checks.every((c) => c.passed));
  });
});
