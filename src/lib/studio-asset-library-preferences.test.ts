import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preferencesToResponse } from "@/server/studio/studio-asset-library-preferences-blob";
import { presentAssetReferenceGenerationError } from "@/lib/studio-asset-reference-errors";

describe("studio-asset-library-preferences", () => {
  it("maps manifest to API response", () => {
    const res = preferencesToResponse({
      version: 1,
      ownerId: "u1",
      updatedAt: "2024-01-01T00:00:00.000Z",
      favorites: [{ assetId: "character:c1", addedAt: "2024-01-01T00:00:00.000Z" }],
      voiceFavorites: [{ voiceRef: "preset_warm", addedAt: "2024-01-01T00:00:00.000Z" }],
      recentAssets: [{ assetId: "character:c1", lastUsedAt: "2024-06-01T00:00:00.000Z" }],
      recentVoices: [],
    });
    assert.deepEqual(res.favorites, ["character:c1"]);
    assert.equal(res.voiceFavorites.length, 1);
    assert.deepEqual(res.recentAssetIds, ["character:c1"]);
  });
});

describe("studio-asset-library ownership errors", () => {
  it("maps provider errors without leaking internals to user key", () => {
    const p = presentAssetReferenceGenerationError("Unknown parameter");
    assert.equal(p.userMessageKey, "studio.assetCreation.reference.generateFailedUser");
    assert.ok(p.providerMessage.includes("Unknown"));
  });
});
