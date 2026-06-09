import {
  UNIVERSE_Z_GLOBE,
  UNIVERSE_Z_PLANET,
  UNIVERSE_Z_PORTAL,
  UNIVERSE_Z_RING,
  UNIVERSE_Z_SATELLITE,
} from "@/lib/universe-planet-ux";

/** Globe render debug layers for visual QA (?universeDebug=ocean|continents|nodes|full) */
export type UniverseGlobeDebugLayer = "ocean" | "continents" | "nodes" | "full";

export const UNIVERSE_GLOBE_DEBUG_LAYERS: UniverseGlobeDebugLayer[] = [
  "ocean",
  "continents",
  "nodes",
  "full",
];

export function resolveUniverseGlobeDebugLayer(
  raw: string | null | undefined
): UniverseGlobeDebugLayer | null {
  if (!raw) return null;
  if (UNIVERSE_GLOBE_DEBUG_LAYERS.includes(raw as UniverseGlobeDebugLayer)) {
    return raw as UniverseGlobeDebugLayer;
  }
  return null;
}

export function shouldShowGlobeContinents(layer: UniverseGlobeDebugLayer | null): boolean {
  if (!layer) return true;
  return layer === "continents" || layer === "nodes" || layer === "full";
}

export function shouldShowGlobeEcosystem(layer: UniverseGlobeDebugLayer | null): boolean {
  if (!layer) return true;
  return layer === "nodes" || layer === "full";
}

/** Orbit-system stacking — globe must stay below planets */
export const UNIVERSE_Z_PIPELINE = 1;
export const UNIVERSE_Z_GLOBE_WRAPPER = 5;
export const UNIVERSE_Z_ORBIT_PLANETS = 50;

/** Hero globe max diameter — must not overlap orbit planets */
export const UNIVERSE_GLOBE_HERO_MAX_PX = 320;

export function validateUniverseLayerOrder(): boolean {
  return (
    UNIVERSE_Z_ORBIT_PLANETS > UNIVERSE_Z_GLOBE_WRAPPER &&
    UNIVERSE_Z_SATELLITE > UNIVERSE_Z_PORTAL &&
    UNIVERSE_Z_PORTAL > UNIVERSE_Z_PLANET &&
    UNIVERSE_Z_PLANET > UNIVERSE_Z_RING &&
    UNIVERSE_Z_RING > UNIVERSE_Z_GLOBE
  );
}
