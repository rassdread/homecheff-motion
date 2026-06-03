import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANIMATION_SCENE_EMOTION_IDS,
  buildSceneEmotionPromptLineForScene,
  normalizeSceneEmotionFields,
  recommendSceneEmotion,
  resolveSceneEmotionId,
  shouldUseSubtleMotionOnly,
  withAutoSceneEmotionPatch,
} from "@/lib/animation-scene-emotions";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { buildInstantStoryModePrompt } from "@/lib/instant-premium-prompt";
import {
  patchSceneTextAtWithEmotion,
  restoreSceneSlotsFromPersisted,
  serializeSceneSlotsForPersist,
} from "@/lib/instant-wizard-scene-slots";

describe("animation scene emotions", () => {
  it("defines all eight Vidu guide emotions", () => {
    assert.equal(ANIMATION_SCENE_EMOTION_IDS.length, 8);
    assert.ok(ANIMATION_SCENE_EMOTION_IDS.includes("enthusiastic"));
    assert.ok(ANIMATION_SCENE_EMOTION_IDS.includes("celebration"));
  });

  it("first scene defaults to enthusiastic", () => {
    assert.equal(
      recommendSceneEmotion({ sceneIndex: 0, sceneCount: 4, heroText: "", title: "" }),
      "enthusiastic"
    );
  });

  it("final scene defaults to celebration", () => {
    assert.equal(
      recommendSceneEmotion({ sceneIndex: 3, sceneCount: 4, heroText: "", title: "" }),
      "celebration"
    );
  });

  it("community keywords resolve to collaborating", () => {
    assert.equal(
      recommendSceneEmotion({
        sceneIndex: 1,
        sceneCount: 4,
        subtitle: "Together with your local community",
      }),
      "collaborating"
    );
  });

  it("join and share keywords resolve to inviting", () => {
    assert.equal(
      recommendSceneEmotion({
        sceneIndex: 2,
        sceneCount: 4,
        heroText: "Join now and share your story",
      }),
      "inviting"
    );
  });

  it("manual override is preserved when text changes", () => {
    const resolved = resolveSceneEmotionId({
      emotionMode: "manual",
      emotion: "proud",
      sceneIndex: 0,
      sceneCount: 3,
      textSignals: { title: "Together in community" },
    });
    assert.equal(resolved, "proud");
  });

  it("auto mode updates when text changes", () => {
    const slots = patchSceneTextAtWithEmotion(
      [
        {
          sceneId: "scene-1",
          image: null,
          text: emptySceneTextDraft(5),
        },
      ],
      0,
      { subtitle: "Join and share today" },
      "story"
    );
    assert.equal(slots[0]!.text.emotionMode, "auto");
    assert.equal(slots[0]!.text.autoEmotion, "inviting");
  });

  it("manual mode is not overwritten when text changes", () => {
    const base = {
      sceneId: "scene-1",
      image: null,
      text: {
        ...emptySceneTextDraft(5),
        emotionMode: "manual" as const,
        emotion: "proud" as const,
      },
    };
    const slots = patchSceneTextAtWithEmotion(
      [base],
      0,
      { subtitle: "Join and share today" },
      "story"
    );
    assert.equal(slots[0]!.text.emotionMode, "manual");
    assert.equal(slots[0]!.text.emotion, "proud");
    assert.equal(slots[0]!.text.autoEmotion, undefined);
  });

  it("persists actingIntensity across serialize round-trip", () => {
    const slots = [
      {
        sceneId: "scene-1",
        image: null,
        text: {
          ...emptySceneTextDraft(5),
          actingIntensity: "very_active" as const,
        },
      },
    ];
    const serialized = serializeSceneSlotsForPersist(slots);
    const restored = restoreSceneSlotsFromPersisted(serialized, [], undefined, 5);
    assert.equal(restored[0]!.text.actingIntensity, "very_active");
  });

  it("manual actingIntensity is not overwritten when auto emotion updates", () => {
    const base = {
      sceneId: "scene-1",
      image: null,
      text: {
        ...emptySceneTextDraft(5),
        emotionMode: "manual" as const,
        emotion: "proud" as const,
        actingIntensity: "subtle" as const,
      },
    };
    const slots = patchSceneTextAtWithEmotion(
      [base],
      0,
      { subtitle: "Join and share today" },
      "story"
    );
    assert.equal(slots[0]!.text.actingIntensity, "subtle");
    assert.equal(slots[0]!.text.emotion, "proud");
  });

  it("persists emotionMode and autoEmotion across serialize round-trip", () => {
    const slots = [
      {
        sceneId: "scene-1",
        image: null,
        text: withAutoSceneEmotionPatch(
          {
            ...emptySceneTextDraft(5),
            subtitle: "Local community together",
          },
          0,
          1,
          "story"
        ),
      },
    ];
    const serialized = serializeSceneSlotsForPersist(slots);
    const restored = restoreSceneSlotsFromPersisted(serialized, [], undefined, 5);
    assert.equal(restored[0]!.text.emotionMode, "auto");
    assert.equal(restored[0]!.text.autoEmotion, "collaborating");
  });

  it("migrates legacy manual emotion field", () => {
    const fields = normalizeSceneEmotionFields({ emotion: "motivated" });
    assert.equal(fields.emotionMode, "manual");
    assert.equal(fields.emotion, "motivated");
  });

  it("injects resolved emotion lines in story mode prompt", () => {
    const prompt = buildInstantStoryModePrompt({
      userIntent: "HomeCheff",
      imageCount: 3,
      transitionSeconds: 5,
      sceneTexts: [
        {
          template: "hero",
          emotionMode: "auto",
          autoEmotion: "enthusiastic",
        },
        {
          template: "scene",
          emotionMode: "manual",
          emotion: "motivated",
        },
        {
          template: "scene",
          emotionMode: "auto",
          autoEmotion: "celebration",
        },
      ],
    });
    assert.match(prompt, /VIDU MULTI-IMAGE DIRECTING \(all scenes\)/i);
    assert.match(prompt, /emotion & acting: Enthusiastic/i);
    assert.match(prompt, /emotion & acting: Motivated/i);
    assert.match(prompt, /emotion & acting: Celebration/i);
  });

  it("active intensity appends mobile-readable acting suffix", () => {
    const line = buildSceneEmotionPromptLineForScene({
      sceneIndex: 0,
      sceneCount: 3,
      actingIntensity: "active",
    });
    assert.match(line, /mobile/i);
  });

  it("shouldUseSubtleMotionOnly is true only for subtle intensity", () => {
    assert.equal(shouldUseSubtleMotionOnly("subtle"), true);
    assert.equal(shouldUseSubtleMotionOnly("active"), false);
  });

  it("buildSceneEmotionPromptLineForScene returns acting guidance", () => {
    const line = buildSceneEmotionPromptLineForScene({
      emotionMode: "manual",
      emotion: "inviting",
      sceneIndex: 0,
      sceneCount: 1,
    });
    assert.match(line, /Inviting/i);
  });
});
