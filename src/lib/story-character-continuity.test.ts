import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStoryCharacterContinuityBlock,
  buildStoryFrameCharacterAssignments,
  DEFAULT_STORY_CONTINUITY_STRENGTH,
  detectStoryCharacterRoleForScene,
} from "@/lib/story-character-continuity";
import {
  buildInstantStoryModePromptDetailed,
  parseStoredStoryContinuityStrength,
} from "@/lib/instant-premium-prompt";
import { normalizeSceneText } from "@/lib/story-overlay-templates";

describe("story character continuity", () => {
  it("defaults continuity strength to strict", () => {
    assert.equal(parseStoredStoryContinuityStrength(null), DEFAULT_STORY_CONTINUITY_STRENGTH);
    assert.equal(parseStoredStoryContinuityStrength(""), "strict");
  });

  it("detects chef and garden roles from scene copy", () => {
    const chef = detectStoryCharacterRoleForScene(
      normalizeSceneText({ title: "CHEF SPECIAL", subtitle: "cook with chef mascot" }),
      0,
      3
    );
    assert.equal(chef.roleId, "CHEF_MASCOT");

    const garden = detectStoryCharacterRoleForScene(
      normalizeSceneText({ title: "GARDEN GROW", subtitle: "plants in the garden" }),
      1,
      3
    );
    assert.equal(garden.roleId, "GARDEN_MASCOT");
  });

  it("continuity block forbids chef/garden swap", () => {
    const scenes = [
      normalizeSceneText({ title: "CHEF" }),
      normalizeSceneText({ title: "GARDEN" }),
    ];
    const block = buildStoryCharacterContinuityBlock({
      assignments: buildStoryFrameCharacterAssignments(scenes, 2),
      strength: "strict",
      aspectRatio: "9:16",
    });
    assert.match(block, /Never transform Chef into Garden/i);
    assert.match(block, /Sergio/i);
    assert.match(block, /Chef mascot/i);
    assert.match(block, /Garden mascot/i);
  });

  it("story prompt includes strict identity lock", () => {
    const { prompt, characterContinuityBlock } = buildInstantStoryModePromptDetailed({
      userIntent: "HomeCheff",
      imageCount: 2,
      transitionSeconds: 5,
      sceneTexts: [
        { template: "hero", heroText: "CHEF START", emotionMode: "auto" },
        { template: "scene", title: "GARDEN GROW", subtitle: "plants", emotionMode: "auto" },
      ],
      aspectRatio: "9:16",
      continuityStrength: "strict",
    });
    assert.match(characterContinuityBlock, /STRICT CHARACTER CONTINUITY/i);
    assert.match(prompt, /Never transform Chef into Garden/i);
    assert.match(prompt, /emotion & acting:/i);
  });
});
