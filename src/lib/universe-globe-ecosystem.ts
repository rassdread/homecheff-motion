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
  { id: "rotterdam", name: "Rotterdam", lat: 51.92, lon: 4.48, tier: 1 },
  { id: "paramaribo", name: "Paramaribo", lat: 5.85, lon: -55.2, tier: 1 },
  { id: "amsterdam", name: "Amsterdam", lat: 52.37, lon: 4.9, tier: 2 },
  { id: "london", name: "London", lat: 51.51, lon: -0.13, tier: 2 },
  { id: "new-york", name: "New York", lat: 40.71, lon: -74.01, tier: 2 },
  { id: "sao-paulo", name: "São Paulo", lat: -23.55, lon: -46.63, tier: 2 },
  { id: "lagos", name: "Lagos", lat: 6.52, lon: 3.38, tier: 2 },
  { id: "mumbai", name: "Mumbai", lat: 19.08, lon: 72.88, tier: 2 },
  { id: "singapore", name: "Singapore", lat: 1.35, lon: 103.82, tier: 2 },
  { id: "sydney", name: "Sydney", lat: -33.87, lon: 151.21, tier: 2 },
  { id: "philipsburg", name: "Philipsburg", lat: 18.03, lon: -63.05, tier: 3 },
  { id: "willemstad", name: "Willemstad", lat: 12.12, lon: -68.88, tier: 3 },
  { id: "oranjestad", name: "Oranjestad", lat: 12.51, lon: -70.01, tier: 3 },
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

export function resolveHubById(id: string): EcosystemHub | undefined {
  return ECOSYSTEM_HUBS.find((hub) => hub.id === id);
}

export function resolveHubNodeRadius(tier: EcosystemHubTier): number {
  if (tier === 1) return 4.2;
  if (tier === 2) return 2.8;
  return 2;
}

export function allEcosystemRoutesResolve(): boolean {
  return ECOSYSTEM_ROUTES.every(
    (route) => resolveHubById(route.from) && resolveHubById(route.to)
  );
}
