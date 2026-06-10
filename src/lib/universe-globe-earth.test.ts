import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import {
  WORLD_MAP_ASSET_PATH,
  WORLD_MAP_SOURCE,
  worldMapAssetConfigured,
} from "@/lib/universe-globe-earth";

describe("universe globe earth asset", () => {
  it("uses public-domain Natural Earth map asset", () => {
    assert.equal(worldMapAssetConfigured(), true);
    assert.equal(WORLD_MAP_SOURCE.license, "Public Domain");
    assert.match(WORLD_MAP_SOURCE.url, /NED_worldmap_110m/);
    assert.equal(WORLD_MAP_ASSET_PATH, "/universe/world-map-natural-earth-110m.svg");
  });

  it("world map SVG exists in public assets", () => {
    const diskPath = `public${WORLD_MAP_ASSET_PATH}`;
    assert.equal(existsSync(diskPath), true);
  });
});
