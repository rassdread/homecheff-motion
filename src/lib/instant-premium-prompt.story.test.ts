import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInstantStoryModePrompt,
  buildInstantStoryModePromptDetailed,
} from "@/lib/instant-premium-prompt";
import { buildInstantVideoPrompt } from "@/lib/instant-premium-prompt";

describe("buildInstantStoryModePrompt", () => {
  const baseInput = {
    userIntent: "HomeCheff promo",
    imageCount: 2,
    sceneTexts: [
      {
        template: "hero" as const,
        heroText: "EARN FROM EVERY ORDER",
        title: "",
        subtitle: "",
        accentWords: [],
        lines: [],
        heroFinale: true,
        heroFinaleText: "JOIN THE MOVEMENT",
        transitionDurationSeconds: 5,
        durationSeconds: 5,
      },
      {
        template: "scene" as const,
        heroText: "",
        title: "THE SYSTEM",
        subtitle: "Trade time for money",
        accentWords: [],
        lines: [],
        heroFinale: true,
        heroFinaleText: "",
        transitionDurationSeconds: 5,
        durationSeconds: 5,
      },
    ],
    transitionSeconds: 5,
    stylePreset: "food_promo" as const,
  };

  it("includes no-new-overlay-text rule and excludes scene copy from in-video rendering", () => {
    const prompt = buildInstantStoryModePrompt(baseInput);
    assert.match(prompt, /Do not generate new visible captions/i);
    assert.match(prompt, /FFmpeg overlay copy added after generation/i);
    assert.match(prompt, /do not render these words as visible text/i);
    assert.match(prompt, /EARN FROM EVERY ORDER/);
    assert.doesNotMatch(prompt, /Leave clean space for post-production captions/);
  });

  it("preserves existing baked UI guidance when protection is not active", () => {
    const prompt = buildInstantStoryModePrompt({ ...baseInput, bakedTextProtectionActive: false });
    assert.match(prompt, /BAKED UI IN SOURCE FRAMES/i);
    assert.match(prompt, /message boxes/i);
    assert.doesNotMatch(prompt, /BAKED-IN TEXT PROTECTION/i);
  });

  it("uses baked-text cleaned block when pre-masked images are sent to Vidu", () => {
    const prompt = buildInstantStoryModePrompt({ ...baseInput, bakedTextProtectionActive: true });
    assert.match(prompt, /BAKED-IN TEXT PROTECTION/i);
    assert.match(prompt, /intentionally cleaned or blanked/i);
    assert.doesNotMatch(prompt, /BAKED UI IN SOURCE FRAMES/i);
  });

  it("includes anti-extra-limbs and mascot stability blocks for character scenes", () => {
    const prompt = buildInstantStoryModePrompt({
      ...baseInput,
      imageCount: 3,
      sceneTexts: [
        ...baseInput.sceneTexts,
        {
          template: "scene" as const,
          heroText: "",
          title: "JOIN THE MOVEMENT",
          subtitle: "Friends together hand on shoulder",
          accentWords: [],
          lines: [],
          heroFinale: true,
          heroFinaleText: "TOGETHER WE GROW",
          transitionDurationSeconds: 5,
          durationSeconds: 7,
        },
      ],
    });
    assert.match(prompt, /Do not invent extra hands/i);
    assert.match(prompt, /Keep mascots clean, toy-like, and stable/i);
    assert.match(prompt, /GENERAL STABILITY/i);
    assert.match(prompt, /CHARACTER & ANATOMY PRESERVATION/i);
    assert.match(prompt, /FFmpeg overlay copy added after generation/i);
  });

  it("still states FFmpeg overlays are added after generation", () => {
    const prompt = buildInstantStoryModePrompt(baseInput);
    assert.match(prompt, /FFmpeg overlay copy added after generation/i);
    assert.match(prompt, /never render them inside the Vidu video/i);
  });

  it("includes strict character continuity and omits subtle-only when acting is active", () => {
    const detailed = buildInstantStoryModePromptDetailed({
      ...baseInput,
      imageCount: 3,
      aspectRatio: "9:16",
      sceneTexts: [
        {
          template: "hero",
          heroText: "START",
          emotionMode: "auto",
          actingIntensity: "active",
        },
        {
          template: "scene",
          title: "BUILD",
          subtitle: "grow and create",
          emotionMode: "manual",
          emotion: "motivated",
          actingIntensity: "active",
        },
        {
          template: "scene",
          title: "TOGETHER",
          subtitle: "community movement finale",
          emotionMode: "auto",
          actingIntensity: "very_active",
        },
      ],
    });
    assert.match(detailed.characterContinuityBlock, /STRICT CHARACTER CONTINUITY/i);
    assert.match(detailed.prompt, /Never transform Chef into Garden/i);
    assert.doesNotMatch(detailed.prompt, /subtle motion only/i);
    assert.match(detailed.prompt, /clearly visible on mobile/i);
  });
});

describe("storyModeClipsReadyForMerge rebuild path", () => {
  it("reuses existing provider output without requiring extra transition rows", async () => {
    const { storyModeClipsReadyForMerge } = await import(
      "@/server/instant-premium/story-mode-transitions"
    );
    assert.equal(
      storyModeClipsReadyForMerge("story", [
        {
          order: 0,
          status: "completed",
          outputVideoUrl: "https://cdn.example/vidu-multiframe.mp4",
        },
      ]),
      true
    );
  });
});

describe("transition mode baked text prompt unchanged", () => {
  it("still injects baked-text cleaned block when protection active", () => {
    const prompt = buildInstantVideoPrompt({
      stylePreset: "food_promo",
      duration: 8,
      aspectRatio: "9:16",
      userIntent: "Test",
      selectedChips: [],
      lockedTextMode: true,
      bakedTextProtectionActive: true,
      textRenderMode: "deevid_text_safe",
    });
    assert.match(prompt, /All text regions were intentionally removed before generation/i);
  });
});
