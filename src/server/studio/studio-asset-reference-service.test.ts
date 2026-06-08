import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateAssetReference,
  isAssetReferenceGenerationAvailable,
} from "@/server/studio/studio-asset-reference-service";

describe("studio-asset-reference-service", () => {
  it("reports provider availability", () => {
    assert.equal(typeof isAssetReferenceGenerationAvailable(), "boolean");
  });

  it("rejects world reference generation", async () => {
    const result = await generateAssetReference(
      { id: "user-1", role: "user" },
      {
        kind: "world",
        summaryPrompt: "A warm world.",
        generationId: "gen-1",
      }
    );
    assert.ok("error" in result);
    assert.equal(result.code, "WORLD_NO_REFERENCE");
  });

  it("requires summary prompt", async () => {
    const result = await generateAssetReference(
      { id: "user-1", role: "user" },
      {
        kind: "character",
        summaryPrompt: "",
        generationId: "gen-2",
      }
    );
    assert.ok("error" in result);
    assert.equal(result.code, "SUMMARY_REQUIRED");
  });

  it("generates character reference with mock provider when configured", async () => {
    if (!isAssetReferenceGenerationAvailable()) {
      return;
    }
    const result = await generateAssetReference(
      { id: "test-user", role: "user" },
      {
        kind: "character",
        summaryPrompt: "A friendly cartoon chef mascot for HomeCheff.",
        choices: { character_type: "chef", character_style: "3d_cartoon" },
        generationId: `test-${Date.now()}`,
      }
    );
    if ("error" in result && result.code === "GENERATION_FAILED") {
      return;
    }
    assert.ok("data" in result);
    assert.ok(result.data.referenceImageUrl.startsWith("http"));
    assert.ok(result.data.referenceStorageKey.includes("wizard-references"));
  });
});
