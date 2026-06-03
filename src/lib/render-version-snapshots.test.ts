import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRenderImageSetFingerprint,
  buildRenderPromptSnapshot,
  diffRenderSnapshots,
} from "@/lib/render-version-snapshots";

describe("render-version-snapshots", () => {
  it("builds stable image set fingerprint from order and ids", () => {
    const fp = buildRenderImageSetFingerprint([
      { id: "b", order: 1 },
      { id: "a", order: 0 },
    ]);
    assert.equal(fp, "0:a|1:b");
  });

  it("detects prompt and settings differences between snapshots", () => {
    const a = {
      promptSnapshot: buildRenderPromptSnapshot({
        userPrompt: null,
        intent: null,
        globalPromptContext: null,
        instantUserIntent: "Hello",
        instantSelectedChips: [],
        instantSceneTexts: [{ template: "scene", emotionMode: "auto", actingIntensity: "active" }],
      }),
      storyboardSnapshot: { instantSceneTexts: [], sceneCount: 0 },
      settingsSnapshot: { instantTransitionSeconds: 5 },
    };
    const b = {
      ...a,
      promptSnapshot: buildRenderPromptSnapshot({
        userPrompt: null,
        intent: null,
        globalPromptContext: null,
        instantUserIntent: "Updated intent",
        instantSelectedChips: [],
        instantSceneTexts: [{ template: "scene", emotionMode: "manual", emotion: "proud", actingIntensity: "very_active" }],
      }),
      settingsSnapshot: { instantTransitionSeconds: 8 },
    };
    const diff = diffRenderSnapshots(a, b);
    assert.ok(diff.some((line) => line.field.includes("userIntent")));
    assert.ok(diff.some((line) => line.field.includes("transitionSeconds")));
  });
});
