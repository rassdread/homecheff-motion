import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addStudioAudioChangePlanItem,
  addStudioAudioProjectAsset,
  emptyStudioAudioChangePlan,
  emptyStudioAudioProjectAssetsRegistry,
  listPendingStudioAudioChangePlanItems,
} from "@/lib/studio-audio-change-plan";
import { buildStudioDirectorAudioSuggestions } from "@/lib/studio-director-audio-suggestions";

describe("studio audio change plan", () => {
  it("adds voice/music/sfx items with planned status", () => {
    let plan = emptyStudioAudioChangePlan("sb-1");
    plan = addStudioAudioChangePlanItem(plan, {
      kind: "voice",
      title: "Anna",
      source: "user",
      applyTarget: "project",
      voiceId: "voice-1",
      provider: "elevenlabs",
    });
    plan = addStudioAudioChangePlanItem(plan, {
      kind: "music",
      title: "Warm track",
      source: "generation",
      applyTarget: "project",
      prompt: "warm music",
      provider: "elevenlabs_music",
    });
    plan = addStudioAudioChangePlanItem(plan, {
      kind: "sound_effect",
      title: "Kitchen ambience",
      source: "generation",
      applyTarget: "scene",
      sceneId: "scene-1",
      sfxCategory: "kitchen",
      provider: "elevenlabs_sfx",
    });

    assert.equal(plan.items.length, 3);
    assert.equal(listPendingStudioAudioChangePlanItems(plan).length, 3);
    assert.equal(plan.items[0].status, "planned");
    assert.equal(plan.items[0].selected, true);
  });

  it("persists audio project assets with metadata", () => {
    let registry = emptyStudioAudioProjectAssetsRegistry("sb-1");
    registry = addStudioAudioProjectAsset(registry, {
      kind: "music",
      provider: "elevenlabs_music",
      audioUrl: "https://example.com/track.mp3",
      prompt: "warm cinematic",
      appliedTo: "project",
      durationSeconds: 30,
    });
    assert.equal(registry.assets.length, 1);
    assert.equal(registry.assets[0].kind, "music");
    assert.equal(registry.assets[0].appliedTo, "project");
  });

  it("builds director audio suggestions for storyboard gaps", () => {
    const suggestions = buildStudioDirectorAudioSuggestions({
      storyboard: {
        id: "sb-1",
        voiceEnabled: false,
        audioAssetLinks: {},
      } as never,
      sceneId: "scene-1",
      sceneIndex: 1,
    });
    assert.ok(suggestions.some((s) => s.kind === "voice"));
    assert.ok(suggestions.some((s) => s.kind === "music"));
    assert.ok(suggestions.some((s) => s.kind === "sound_effect"));
  });
});
