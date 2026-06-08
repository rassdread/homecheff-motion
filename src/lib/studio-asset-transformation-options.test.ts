import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterTypeChoiceDef,
  buildDerivationTransformDef,
  detectRecommendedRoleIds,
} from "@/lib/studio-asset-transformation-options";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";

function source(name: string, role?: string): AssetDerivationSourceListItem {
  return {
    assetId: `a-${name}`,
    name,
    kind: "character",
    referenceImageUrl: "https://example.com/ref.png",
    referenceStorageKey: "",
    thumbnailUrl: "https://example.com/thumb.png",
    canonicalRole: role,
    sourceType: "library_asset",
  };
}

describe("studio-asset-transformation-options", () => {
  it("detects HomeCheff roles from library assets", () => {
    const ids = detectRecommendedRoleIds([
      source("Globe Man Chef", "chef"),
      source("Garden guide", "garden"),
    ]);
    assert.deepEqual(ids.sort(), ["chef", "garden"]);
  });

  it("shows Chef/Garden/Designer first for HomeCheff library user", () => {
    const def = buildCharacterTypeChoiceDef([
      source("Chef mascot", "chef"),
      source("Garden hero", "garden"),
      source("Designer", "designer"),
    ]);
    const optionIds = def.options.map((o) => o.id);
    assert.deepEqual(optionIds.slice(0, 3), ["chef", "garden", "designer"]);
    assert.ok(optionIds.includes("host"));
    assert.ok(optionIds.includes("custom"));
    assert.equal(def.hintKey, "studio.assetCreation.choices.character_type.hintRecommended");
  });

  it("shows generic roles for user without library roles", () => {
    const def = buildCharacterTypeChoiceDef([]);
    const optionIds = def.options.map((o) => o.id);
    assert.equal(optionIds.includes("chef"), false);
    assert.equal(optionIds.includes("garden"), false);
    assert.deepEqual(optionIds.slice(0, 3), ["host", "mascot", "narrator"]);
    assert.equal(def.hintKey, "studio.assetCreation.choices.character_type.hint");
  });

  it("builds prop transformation options generically", () => {
    const def = buildDerivationTransformDef("prop", []);
    assert.ok(def);
    const ids = def!.options.map((o) => o.id);
    assert.deepEqual(ids.slice(0, 3), ["product_variant", "packaging", "premium"]);
  });

  it("builds location transformation options generically", () => {
    const def = buildDerivationTransformDef("location", []);
    assert.ok(def);
    const ids = def!.options.map((o) => o.id);
    assert.deepEqual(ids.slice(0, 3), ["day", "night", "premium"]);
  });
});
