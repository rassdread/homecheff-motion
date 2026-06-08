import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVoicePreviewDedupHash } from "@/server/provider-cost/studio-cost-metering";

describe("preview duplication measurement", () => {
  it("detects duplicate preview hashes in synthetic event set", () => {
    const hash = buildVoicePreviewDedupHash({
      voiceId: "voice-1",
      previewText: "Test line",
      language: "en",
      modelId: "eleven_multilingual_v2",
    });

    const events = [
      { hash, cost: 0.01 },
      { hash, cost: 0.01 },
      { hash: "other", cost: 0.01 },
    ];

    const byHash = new Map<string, { count: number; cost: number }>();
    for (const e of events) {
      const cur = byHash.get(e.hash) ?? { count: 0, cost: 0 };
      cur.count += 1;
      cur.cost += e.cost;
      byHash.set(e.hash, cur);
    }

    let duplicateEvents = 0;
    let waste = 0;
    for (const data of byHash.values()) {
      if (data.count > 1) {
        duplicateEvents += data.count - 1;
        waste += (data.cost / data.count) * (data.count - 1);
      }
    }

    assert.equal(duplicateEvents, 1);
    assert.equal(waste, 0.01);
  });
});
