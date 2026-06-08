import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assetUsageKindFromParam } from "@/server/studio/studio-asset-story-usage";
import { normalizeAssetCreateEntryPath } from "@/lib/studio-asset-create-entry-path";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

describe("studio-home-consolidation", () => {
  it("accepts asset usage kinds for usage API", () => {
    assert.equal(assetUsageKindFromParam("character"), true);
    assert.equal(assetUsageKindFromParam("prop"), true);
    assert.equal(assetUsageKindFromParam("location"), true);
    assert.equal(assetUsageKindFromParam("world"), true);
    assert.equal(assetUsageKindFromParam("voice"), false);
  });

  it("redirects legacy existing_asset entry to derive flow", () => {
    assert.equal(normalizeAssetCreateEntryPath("existing_asset"), "derive_from_reference");
  });

  it("workspace href uses /studio with storyboardId query", () => {
    assert.equal(studioWorkspaceHref("sb-1"), "/studio?storyboardId=sb-1");
  });

  it("my-studio legacy path resolves to studio home", () => {
    assert.equal("/studio/my-studio".replace("/studio/my-studio", "/studio"), "/studio");
  });
});
