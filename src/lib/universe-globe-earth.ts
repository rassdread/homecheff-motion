/**
 * Natural Earth world map asset (public domain).
 *
 * Source: Wikimedia Commons — File:NED_worldmap_110m.svg
 * Author: Gringer / Goran tek-en (Natural Earth 1:110m, QGIS export)
 * License: Public domain
 * URL: https://commons.wikimedia.org/wiki/File:NED_worldmap_110m.svg
 *
 * Equirectangular 800×400 (lon −180…180, lat 90…−90).
 */

export const WORLD_MAP_ASSET_PATH = "/universe/world-map-natural-earth-110m.svg";

/** Land silhouettes only — transparent ocean, #006D52 fill (derived from WORLD_MAP_ASSET_PATH) */
export const WORLD_MAP_LAND_ASSET_PATH = "/universe/world-map-homecheff-land.svg";

export const WORLD_MAP_WIDTH = 800;
export const WORLD_MAP_HEIGHT = 400;

export const UNIVERSE_GLOBE_OCEAN_COLOR = "#0067B1";
export const UNIVERSE_GLOBE_LAND_COLOR = "#006D52";

export const WORLD_MAP_SOURCE = {
  name: "NED_worldmap_110m.svg",
  provider: "Natural Earth via Wikimedia Commons",
  license: "Public Domain",
  url: "https://commons.wikimedia.org/wiki/File:NED_worldmap_110m.svg",
  scale: "1:110m",
  projection: "Equirectangular",
} as const;

/** @deprecated Hand-drawn blobs replaced by WORLD_MAP_ASSET_PATH */
export const EARTH_MAP_WIDTH = WORLD_MAP_WIDTH;
/** @deprecated */
export const EARTH_MAP_HEIGHT = WORLD_MAP_HEIGHT;

export function worldMapAssetConfigured(): boolean {
  return Boolean(WORLD_MAP_ASSET_PATH && WORLD_MAP_WIDTH > 0);
}
