import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStudioAiAssistantEnabled } from "@/lib/studio-ai-assistant-flag";

describe("isStudioAiAssistantEnabled", () => {
  const original = process.env.NEXT_PUBLIC_STUDIO_AI_ASSISTANT;

  it("is enabled by default", () => {
    delete process.env.NEXT_PUBLIC_STUDIO_AI_ASSISTANT;
    assert.equal(isStudioAiAssistantEnabled(), true);
  });

  it("can be disabled via env", () => {
    process.env.NEXT_PUBLIC_STUDIO_AI_ASSISTANT = "false";
    assert.equal(isStudioAiAssistantEnabled(), false);
  });

  it("restores env", () => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_STUDIO_AI_ASSISTANT;
    } else {
      process.env.NEXT_PUBLIC_STUDIO_AI_ASSISTANT = original;
    }
  });
});
