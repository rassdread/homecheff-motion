import { EARTH_MAP_HEIGHT, EARTH_MAP_WIDTH } from "@/lib/universe-globe-earth";

export type EcosystemHubTier = 1 | 2 | 3;

export type EcosystemHub = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  tier: EcosystemHubTier;
};

export type EcosystemRoute = {
  from: string;
  to: string;
};

export const ECOSYSTEM_HUBS: EcosystemHub[] = [
  { id: "rotterdam", name: "Rotterdam", lat: 51.9244, lon: 4.4777, tier: 1 },
  { id: "paramaribo", name: "Paramaribo", lat: 5.852, lon: -55.2038, tier: 1 },
  { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lon: 4.9041, tier: 2 },
  { id: "london", name: "London", lat: 51.5072, lon: -0.1276, tier: 2 },
  { id: "new-york", name: "New York", lat: 40.7128, lon: -74.006, tier: 2 },
  { id: "sao-paulo", name: "São Paulo", lat: -23.5558, lon: -46.6396, tier: 2 },
  { id: "lagos", name: "Lagos", lat: 6.5244, lon: 3.3792, tier: 2 },
  { id: "mumbai", name: "Mumbai", lat: 19.076, lon: 72.8777, tier: 2 },
  { id: "singapore", name: "Singapore", lat: 1.3521, lon: 103.8198, tier: 2 },
  { id: "sydney", name: "Sydney", lat: -33.8688, lon: 151.2093, tier: 2 },
  { id: "philipsburg", name: "Philipsburg", lat: 18.026, lon: -63.0458, tier: 3 },
  { id: "willemstad", name: "Willemstad", lat: 12.1696, lon: -68.99, tier: 3 },
  { id: "oranjestad", name: "Oranjestad", lat: 12.5092, lon: -70.0086, tier: 3 },
];

export const ECOSYSTEM_ROUTES: EcosystemRoute[] = [
  { from: "rotterdam", to: "amsterdam" },
  { from: "rotterdam", to: "london" },
  { from: "rotterdam", to: "new-york" },
  { from: "rotterdam", to: "paramaribo" },
  { from: "paramaribo", to: "philipsburg" },
  { from: "paramaribo", to: "willemstad" },
  { from: "paramaribo", to: "oranjestad" },
  { from: "london", to: "mumbai" },
  { from: "london", to: "singapore" },
  { from: "singapore", to: "sydney" },
  { from: "sao-paulo", to: "lagos" },
];

export function latLonToMapCoords(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * EARTH_MAP_WIDTH,
    y: ((90 - lat) / 180) * EARTH_MAP_HEIGHT,
  };
}

export function resolveHubNodeRadius(tier: EcosystemHubTier): number {
  if (tier === 1) return 3.2;
  if (tier === 2) return 2.2;
  return 1.6;
}

export function resolveHubGlowRadius(tier: EcosystemHubTier): number {
  if (tier === 1) return 7;
  if (tier === 2) return 5;
  return 4;
}

export function resolveHubById(id: string): EcosystemHub | undefined {
  return ECOSYSTEM_HUBS.find((hub) => hub.id === id);
}

export function allEcosystemRoutesResolve(): boolean {
  return ECOSYSTEM_ROUTES.every(
    (route) => resolveHubById(route.from) && resolveHubById(route.to)
  );
}

import { projectLatLonToGlobePoint } from "@/lib/universe-globe-projection";

export function projectHubToGlobe(
  lat: number,
  lon: number,
  rotationDeg: number
) {
  return projectLatLonToGlobePoint({ lat, lon, rotationDeg });
}

/** @deprecated Use projectLatLonToGlobePoint with rotationDeg */
export function latLonToSphereOverlay(
  lat: number,
  lon: number,
  centerLon = 10
): { leftPct: number; topPct: number; visible: boolean } {
  const p = projectLatLonToGlobePoint({ lat, lon, rotationDeg: centerLon });
  return { leftPct: p.x, topPct: p.y, visible: p.visible };
}
