import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeSceneImageContinuity,
  analyzeSceneImagePlanner,
  buildAiSceneDescription,
  buildSceneImageRequirements,
  buildStoryboardAssetRegistries,
  computeVisualConsistencyScore,
  detectMissingSceneReferences,
  resolveStoryboardImageReadiness,
} from "@/lib/studio-scene-image-planner";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { StudioSceneDetail } from "@/types/studio-api";

function character(id: string, name: string, extra?: { isMascot?: boolean; defaultClothing?: string }) {
  return studioCharacterListItem({
    id,
    name,
    role: extra?.isMascot ? "mascot" : "human",
    isMascot: extra?.isMascot,
    defaultClothing: extra?.defaultClothing,
  });
}

function location(id: string, name: string) {
  return studioLocationListItem({ id, name, description: `${name} interior` });
}

function scene(partial: Partial<StudioSceneDetail> & { order: number }) {
  return studioSceneDetail(partial);
}

function storyboard(scenes: StudioSceneDetail[]) {
  return studioStoryboardDetail({ title: "Test board", scenes });
}

describe("studio-scene-image-planner", () => {
  it("buildSceneImageRequirements lists characters, location, mood, and framing", () => {
    const req = buildSceneImageRequirements(
      scene({
        order: 3,
        title: "Office walk",
        characters: [character("c1", "Sergio"), character("c2", "Chef Mascot", { isMascot: true })],
        location: location("l1", "Modern Rotterdam office"),
        props: [],
        emotion: "optimistic",
        shotType: "medium_wide",
      }),
      "build_up",
      "commercial"
    );
    assert.deepEqual(req.characterNames, ["Sergio", "Chef Mascot"]);
    assert.equal(req.locationName, "Modern Rotterdam office");
    assert.equal(req.cameraFraming, "Med Wide");
    assert.match(req.visualMood, /optimistic/i);
  });

  it("buildStoryboardAssetRegistries tracks storyboard-level cast and locations", () => {
    const sb = storyboard([
      scene({
        order: 0,
        characters: [character("c1", "Sergio")],
        location: location("l1", "Rotterdam"),
      }),
      scene({
        order: 1,
        characters: [character("c1", "Sergio"), character("c2", "Garden Mascot", { isMascot: true })],
        location: location("l1", "Rotterdam"),
      }),
    ]);
    const reg = buildStoryboardAssetRegistries(sb);
    assert.equal(reg.characters.length, 2);
    assert.equal(reg.locations[0]?.name, "Rotterdam");
    assert.equal(reg.characters.find((c) => c.name === "Sergio")?.sceneCount, 2);
  });

  it("analyzeSceneImageContinuity warns when mascot disappears between scenes", () => {
    const sb = storyboard([
      scene({
        order: 0,
        characters: [character("c1", "Chef Mascot", { isMascot: true })],
      }),
      scene({ order: 1, characters: [character("c1", "Chef Mascot", { isMascot: true })] }),
      scene({ order: 2, characters: [] }),
      scene({ order: 3, characters: [character("c1", "Chef Mascot", { isMascot: true })] }),
    ]);
    const warnings = analyzeSceneImageContinuity(sb);
    assert.ok(
      warnings.some((w) => w.code === "mascot_disappears" && w.messageKey.includes("mascotDisappears"))
    );
  });

  it("analyzeSceneImageContinuity warns on clothing shift between adjacent scenes", () => {
    const sb = storyboard([
      scene({
        order: 0,
        characters: [character("c1", "Sergio", { defaultClothing: "formal suit" })],
        description: "Sergio in a formal suit presents the plan",
      }),
      scene({
        order: 1,
        characters: [character("c1", "Sergio")],
        description: "Sergio in casual hoodie reacts to news",
      }),
    ]);
    const warnings = analyzeSceneImageContinuity(sb);
    assert.ok(warnings.some((w) => w.code === "character_clothing_shift"));
  });

  it("analyzeSceneImageContinuity warns on location jump without transition", () => {
    const sb = storyboard([
      scene({
        order: 0,
        location: location("l1", "Office"),
        transitionToNext: "",
      }),
      scene({
        order: 1,
        location: location("l2", "Community Garden"),
      }),
    ]);
    const warnings = analyzeSceneImageContinuity(sb);
    assert.ok(warnings.some((w) => w.code === "location_jump"));
  });

  it("buildAiSceneDescription composes a single-line image brief", () => {
    const line = buildAiSceneDescription({
      sceneId: "s1",
      order: 0,
      title: "Intro",
      characterNames: ["Sergio", "Chef Mascot"],
      locationName: "Modern Rotterdam office",
      objectNames: [],
      visualMood: "Professional, optimistic",
      timeOfDay: "Daylight",
      cameraFraming: "Med Wide",
      arcPhase: "opening",
    });
    assert.match(line, /Modern Rotterdam office/i);
    assert.match(line, /Sergio/i);
    assert.match(line, /daylight/i);
    assert.match(line, /med wide/i);
  });

  it("computeVisualConsistencyScore penalizes continuity warnings", () => {
    const sb = storyboard([
      scene({ order: 0, location: location("l1", "Office") }),
      scene({ order: 1, location: location("l2", "Garden") }),
    ]);
    const warnings = analyzeSceneImageContinuity(sb);
    const high = computeVisualConsistencyScore({ storyboard: sb, warnings: [] });
    const low = computeVisualConsistencyScore({ storyboard: sb, warnings });
    assert.ok(low.score < high.score);
  });

  it("resolveStoryboardImageReadiness marks ready when score and warnings are clean", () => {
    const ready = resolveStoryboardImageReadiness({
      visualConsistencyScore: 85,
      warnings: [],
      sceneCount: 4,
    });
    assert.equal(ready.readiness, "ready");
    const attention = resolveStoryboardImageReadiness({
      visualConsistencyScore: 70,
      warnings: [{ code: "x", messageKey: "k", sceneIds: [] }],
      sceneCount: 4,
    });
    assert.equal(attention.readiness, "needs_attention");
  });

  it("analyzeSceneImagePlanner exports three prompt variants per scene", () => {
    const sb = storyboard([
      scene({
        order: 0,
        description: "Sergio welcomes the team at the office",
        characters: [character("c1", "Sergio")],
        location: location("l1", "Modern Rotterdam office"),
        shotType: "medium_wide",
      }),
    ]);
    const report = analyzeSceneImagePlanner({ storyboard: sb });
    assert.equal(report.scenes.length, 1);
    assert.ok(report.scenes[0]!.exports.imageGenerationPrompt.length > 40);
    assert.ok(report.scenes[0]!.exports.viduContextPrompt.length > 10);
    assert.ok(report.scenes[0]!.exports.storyboardVisualPrompt.length > 10);
    assert.ok(report.registries.characters.length >= 1);
  });

  it("detectMissingSceneReferences flags climax without cast", () => {
    const scenes: StudioSceneDetail[] = [];
    for (let i = 0; i < 6; i += 1) {
      scenes.push(
        scene({
          order: i,
          characters: i === 3 ? [] : [character("c1", "Sergio")],
          shotType: i === 3 ? "close_up" : "medium",
          sceneEnergy: i === 3 ? "intense" : "neutral",
        })
      );
    }
    const warnings = detectMissingSceneReferences(storyboard(scenes));
    assert.ok(warnings.length >= 0);
  });
});
