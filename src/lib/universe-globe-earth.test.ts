import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  UNIVERSE_GLOBE_LAND_COLOR,
  UNIVERSE_GLOBE_OCEAN_COLOR,
  WORLD_MAP_ASSET_PATH,
  WORLD_MAP_LAND_ASSET_PATH,
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

  it("HomeCheff land layer uses separate asset with brand colors", () => {
    assert.equal(WORLD_MAP_LAND_ASSET_PATH, "/universe/world-map-homecheff-land.svg");
    assert.equal(UNIVERSE_GLOBE_OCEAN_COLOR, "#0067B1");
    assert.equal(UNIVERSE_GLOBE_LAND_COLOR, "#006D52");
    assert.equal(existsSync(`public${WORLD_MAP_LAND_ASSET_PATH}`), true);
    const landSvg = readFileSync(`public${WORLD_MAP_LAND_ASSET_PATH}`, "utf8");
    assert.match(landSvg, /fill:#006D52/);
    assert.match(landSvg, /fill:none;fill-opacity:0/);
    assert.doesNotMatch(landSvg, /fill:#c6ecff/);
  });
});
