import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSET_INTELLIGENCE_USER_TEST,
  assetProfileOnDocument,
  assetRecommendationsPanelWired,
  computeAssetIntelligenceScore,
  editorAssetProfileTypeExists,
  v7SuggestionsUseProfile,
} from "@/lib/editor-asset-intelligence-audit";

describe("Editor Asset Intelligence Audit", () => {
  it("EditorAssetProfile type exists", () => {
    assert.equal(editorAssetProfileTypeExists(), true);
  });

  it("assetProfile stored on document", () => {
    assert.equal(assetProfileOnDocument(), true);
  });

  it("recommendations panel wired in workspace", () => {
    assert.equal(assetRecommendationsPanelWired(), true);
  });

  it("v7 suggestions use asset profile", () => {
    assert.equal(v7SuggestionsUseProfile(), true);
  });

  it("user test covers five asset types", () => {
    assert.equal(ASSET_INTELLIGENCE_USER_TEST.length, 5);
  });

  it("overall intelligence score meets threshold", () => {
    const score = computeAssetIntelligenceScore();
    assert.ok(score.overall >= 7, `overall ${score.overall}`);
    assert.ok(score.recommendations >= 7);
  });
});
