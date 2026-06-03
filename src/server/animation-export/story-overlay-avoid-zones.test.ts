import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAvoidBoxPenaltiesToZones,
  isCenterZoneUnsafe,
  rejectUnsafeCenterForHero,
  STORY_CENTER_HEAD_AVOID_ZONE,
} from "@/server/animation-export/story-overlay-avoid-zones";
import { analyzeSafeZonesFromBuffer } from "@/server/animation-export/safe-zone-placement";

describe("story overlay avoid zones", () => {
  it("penalizes center zone when face box overlaps", () => {
    const data = Buffer.alloc(64 * 64 * 4, 200);
    const v1 = analyzeSafeZonesFromBuffer(data, 64, 64, 4);
    const penalized = applyAvoidBoxPenaltiesToZones(v1.zones, [
      {
        x: 0.3,
        y: 0.25,
        width: 0.4,
        height: 0.35,
        source: "mediapipe",
        label: "face",
        confidence: 0.9,
      },
    ]);
    const center = penalized.find((z) => z.zoneId === "CENTER");
    const top = penalized.find((z) => z.zoneId === "TOP_CENTER");
    assert.ok(center && top);
    assert.ok(top.score > center.score);
  });

  it("rejects center hero placement when center is unsafe on 9:16", () => {
    const unsafe = isCenterZoneUnsafe([STORY_CENTER_HEAD_AVOID_ZONE]);
    assert.equal(unsafe, true);
    assert.equal(rejectUnsafeCenterForHero("CENTER", [STORY_CENTER_HEAD_AVOID_ZONE], "9:16"), "TOP_CENTER");
  });
});
