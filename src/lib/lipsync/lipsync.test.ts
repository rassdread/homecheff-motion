import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateLipsyncReservedUsd,
  getLipsyncProviderId,
  isTrueLipsyncConfigured,
} from "@/lib/lipsync/config";
import { buildCreativePlanV2 } from "@/lib/simple-studio/intent-routing";
import { usdToCredits } from "@/lib/studio-credit-constants";

describe("True lipsync config + routing", () => {
  it("exposes provider selection helpers", () => {
    assert.equal(typeof isTrueLipsyncConfigured(), "boolean");
    assert.ok(["hedra_avatar", "replicate_sadtalker", "none"].includes(getLipsyncProviderId()));
  });

  it("prices SadTalker and Hedra with margin formula", () => {
    const sad = estimateLipsyncReservedUsd({
      provider: "replicate_sadtalker",
      durationSeconds: 15,
    });
    assert.equal(sad, 0.2);
    assert.ok(usdToCredits(sad, 50) >= 50);

    const hedra15 = estimateLipsyncReservedUsd({
      provider: "hedra_avatar",
      durationSeconds: 15,
    });
    assert.ok(hedra15 >= 0.89);
    assert.ok(usdToCredits(hedra15, 50) >= 100);
  });

  it("enables lipsync engine chain only when configured", () => {
    const off = buildCreativePlanV2({
      story:
        'Laat deze persoon zeggen: "Welkom bij HomeCheff." Laat hem natuurlijk bewegen.',
      media: [{ id: "1", kind: "image", url: "https://example.com/face.jpg" }],
      purposeHint: "universal",
      lipsyncEngineAvailable: false,
    });
    assert.equal(off.lipsync.requested, true);
    assert.equal(off.lipsync.available, false);
    assert.ok(!off.engineChain.includes("lipsync_avatar"));

    const on = buildCreativePlanV2({
      story:
        'Laat deze persoon zeggen: "Welkom bij HomeCheff." Laat hem natuurlijk bewegen.',
      media: [{ id: "1", kind: "image", url: "https://example.com/face.jpg" }],
      purposeHint: "universal",
      lipsyncEngineAvailable: true,
    });
    assert.equal(on.lipsync.available, true);
    assert.ok(on.engineChain.includes("lipsync_avatar"));
    assert.ok(on.engineChain.includes("voice_tts"));
    assert.ok(on.hcActions.includes("lipsync_talking_avatar"));
  });

  it("keeps voiceover without lipsync cost", () => {
    const plan = buildCreativePlanV2({
      story: "Maak hier een video van met een voice-over die vertelt dat de winkel zaterdag geopend is.",
      media: [{ id: "1", kind: "image", url: "https://example.com/shop.jpg" }],
      purposeHint: "universal",
      lipsyncEngineAvailable: true,
    });
    assert.equal(plan.speechMode, "narration");
    assert.equal(plan.lipsync.requested, false);
    assert.ok(!plan.engineChain.includes("lipsync_avatar"));
  });
});
