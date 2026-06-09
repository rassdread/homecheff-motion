/**
 * Simplified Natural Earth–style coastlines (public-domain silhouette reference).
 * Equirectangular projection: viewBox 360×180, x = lon+180, y = 90−lat.
 */

export const EARTH_MAP_WIDTH = 360;
export const EARTH_MAP_HEIGHT = 180;

const GREEN = "#006D52";
const GREEN_LIGHT = "#0a8a6f";
const POLAR = "#e8f4f0";

function ll(lon: number, lat: number): string {
  return `${(lon + 180).toFixed(1)},${(90 - lat).toFixed(1)}`;
}

function poly(points: [number, number][]): string {
  if (points.length === 0) return "";
  let d = `M ${ll(points[0][0], points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${ll(points[i][0], points[i][1])}`;
  }
  return `${d} Z`;
}

const NORTH_AMERICA: [number, number][] = [
  [-168, 65], [-166, 68], [-152, 70], [-140, 69], [-130, 56], [-125, 49],
  [-123, 48], [-117, 32], [-105, 31], [-97, 26], [-87, 21], [-82, 25],
  [-81, 30], [-75, 35], [-70, 43], [-67, 45], [-74, 40], [-76, 38],
  [-81, 42], [-87, 45], [-93, 48], [-104, 49], [-115, 48], [-122, 49],
  [-130, 54], [-135, 58], [-150, 61], [-168, 65],
];

const GREENLAND: [number, number][] = [
  [-45, 60], [-25, 62], [-18, 70], [-22, 76], [-35, 82], [-52, 78],
  [-58, 72], [-50, 65], [-45, 60],
];

const SOUTH_AMERICA: [number, number][] = [
  [-81, 12], [-77, 8], [-72, 11], [-62, 10], [-55, 5], [-50, 0],
  [-45, -2], [-38, -3], [-35, -8], [-40, -15], [-45, -22], [-48, -28],
  [-52, -33], [-58, -38], [-65, -42], [-72, -48], [-75, -52], [-73, -45],
  [-70, -38], [-68, -28], [-70, -18], [-75, -8], [-81, 0], [-81, 12],
];

const EUROPE: [number, number][] = [
  [-10, 36], [-5, 43], [-4, 48], [-2, 51], [3, 51], [8, 54], [12, 55],
  [18, 57], [25, 60], [30, 62], [32, 58], [28, 52], [24, 48], [20, 44],
  [15, 42], [10, 44], [5, 43], [0, 39], [-5, 36], [-10, 36],
];

const BRITISH_ISLES: [number, number][] = [
  [-5, 50], [-3, 52], [-4, 55], [-6, 58], [-8, 56], [-5, 50],
];

const AFRICA: [number, number][] = [
  [-17, 15], [-10, 12], [0, 5], [10, 4], [20, 8], [30, 12], [38, 12],
  [42, 10], [50, 12], [51, 8], [45, 2], [40, -5], [35, -10], [30, -15],
  [25, -20], [20, -28], [18, -35], [15, -32], [12, -25], [10, -15],
  [8, -5], [5, 5], [0, 8], [-5, 5], [-10, 8], [-15, 12], [-17, 15],
];

const ASIA: [number, number][] = [
  [25, 42], [35, 45], [45, 42], [55, 38], [65, 42], [75, 38], [85, 28],
  [95, 22], [105, 18], [115, 22], [120, 28], [125, 35], [130, 42],
  [135, 48], [140, 52], [145, 55], [142, 48], [135, 42], [128, 35],
  [120, 30], [110, 22], [100, 12], [95, 8], [88, 5], [80, 8], [72, 12],
  [68, 18], [62, 22], [58, 28], [52, 32], [45, 35], [38, 38], [30, 40],
  [25, 42],
];

const INDIA: [number, number][] = [
  [68, 24], [72, 20], [78, 12], [82, 8], [88, 12], [92, 18], [88, 24],
  [82, 28], [75, 32], [70, 28], [68, 24],
];

const SE_ASIA: [number, number][] = [
  [98, 12], [105, 8], [112, 2], [118, -2], [125, -5], [130, -2], [135, 2],
  [128, 8], [120, 12], [110, 15], [100, 18], [98, 12],
];

const JAPAN: [number, number][] = [
  [130, 32], [132, 34], [135, 36], [140, 38], [142, 42], [138, 40], [130, 32],
];

const AUSTRALIA: [number, number][] = [
  [115, -22], [125, -18], [135, -15], [145, -18], [150, -22], [153, -28],
  [150, -35], [145, -38], [135, -35], [128, -32], [118, -28], [115, -22],
];

const NEW_ZEALAND: [number, number][] = [
  [172, -42], [175, -38], [178, -42], [175, -46], [172, -42],
];

const ANTARCTICA: [number, number][] = [
  [-180, -65], [-120, -68], [-60, -70], [0, -68], [60, -70], [120, -68],
  [180, -65], [180, -90], [-180, -90], [-180, -65],
];

const ARCTIC: [number, number][] = [
  [-180, 90], [180, 90], [180, 75], [120, 72], [60, 74], [0, 72],
  [-60, 74], [-120, 72], [-180, 75], [-180, 90],
];

export type EarthContinentPath = {
  id: string;
  d: string;
  fill: string;
  opacity?: number;
};

export const EARTH_CONTINENT_PATHS: EarthContinentPath[] = [
  { id: "north-america", d: poly(NORTH_AMERICA), fill: GREEN },
  { id: "greenland", d: poly(GREENLAND), fill: GREEN_LIGHT },
  { id: "south-america", d: poly(SOUTH_AMERICA), fill: GREEN_LIGHT },
  { id: "europe", d: poly(EUROPE), fill: GREEN },
  { id: "british-isles", d: poly(BRITISH_ISLES), fill: GREEN },
  { id: "africa", d: poly(AFRICA), fill: GREEN_LIGHT },
  { id: "asia", d: poly(ASIA), fill: GREEN },
  { id: "india", d: poly(INDIA), fill: GREEN_LIGHT },
  { id: "se-asia", d: poly(SE_ASIA), fill: GREEN_LIGHT },
  { id: "japan", d: poly(JAPAN), fill: GREEN },
  { id: "australia", d: poly(AUSTRALIA), fill: GREEN_LIGHT },
  { id: "new-zealand", d: poly(NEW_ZEALAND), fill: GREEN_LIGHT },
  { id: "antarctica", d: poly(ANTARCTICA), fill: POLAR, opacity: 0.55 },
  { id: "arctic", d: poly(ARCTIC), fill: POLAR, opacity: 0.45 },
];

export const EARTH_CONTINENT_IDS = EARTH_CONTINENT_PATHS.map((c) => c.id);

export const EARTH_REQUIRED_CONTINENT_IDS = [
  "north-america",
  "south-america",
  "europe",
  "africa",
  "asia",
  "australia",
] as const;

export function allRequiredContinentsPresent(): boolean {
  const ids = new Set(EARTH_CONTINENT_IDS);
  return EARTH_REQUIRED_CONTINENT_IDS.every((id) => ids.has(id));
}

export function buildEarthMapSvgId(prefix: string, continentId: string): string {
  return `${prefix}-${continentId}`;
}
