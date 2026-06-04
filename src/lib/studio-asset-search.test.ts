import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterStudioAssetsBySearch } from "@/lib/studio-asset-search";

describe("studio asset search", () => {
  it("filters by name, description and extra fields", () => {
    const items = [
      { name: "HomeCheff Mug", description: "Globe logo mug", id: "1" },
      { name: "Chef Laptop", description: "Promo laptop", id: "2" },
    ];
    const result = filterStudioAssetsBySearch(items, "mug", () => "");
    assert.equal(result.length, 1);
    assert.equal(result[0]?.name, "HomeCheff Mug");
  });

  it("returns all when query empty", () => {
    const items = [{ name: "A", description: "", id: "1" }];
    assert.equal(filterStudioAssetsBySearch(items, "").length, 1);
  });
});
