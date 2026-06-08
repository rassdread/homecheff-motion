import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COST_ACTION,
  INSTRUMENTATION_ONLY_ACTIONS,
} from "@/server/provider-cost/cost-event-types";

describe("studio cost metering config", () => {
  it("studio actions are instrumentation-only (no billing sync)", () => {
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.OPENAI_SCENE_IMAGE));
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.OPENAI_VISION));
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.ELEVENLABS_TTS));
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.ELEVENLABS_CLONE));
    assert.equal(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.VIDU_RENDER), false);
    assert.equal(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.OPENAI_OCR), false);
  });
});
