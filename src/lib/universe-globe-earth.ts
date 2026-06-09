/**
 * World map paths — Natural Earth–style simplified silhouettes.
 * Equirectangular 360×180: x = lon+180, y = 90−lat.
 * Source: public-domain simplified coastline reference (110m scale).
 */

export const EARTH_MAP_WIDTH = 360;
export const EARTH_MAP_HEIGHT = 180;

const GREEN = "#006D52";
const GREEN_LIGHT = "#0a8a6f";
const POLAR = "#dceef5";

function ll(lon: number, lat: number): string {
  return `${(lon + 180).toFixed(2)},${(90 - lat).toFixed(2)}`;
}

function poly(points: [number, number][]): string {
  if (points.length === 0) return "";
  let d = `M ${ll(points[0][0], points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${ll(points[i][0], points[i][1])}`;
  }
  return `${d} Z`;
}

/** North America — Alaska through Central America */
const NORTH_AMERICA: [number, number][] = [
  [-168, 65], [-165, 68], [-152, 70], [-141, 69], [-135, 60], [-130, 56],
  [-125, 50], [-123, 48], [-120, 46], [-117, 34], [-112, 32], [-105, 31],
  [-100, 28], [-97, 26], [-90, 22], [-87, 21], [-83, 22], [-82, 25],
  [-81, 28], [-80, 30], [-78, 33], [-75, 35], [-72, 38], [-70, 41],
  [-67, 44], [-69, 47], [-74, 45], [-76, 42], [-79, 40], [-82, 38],
  [-85, 42], [-88, 44], [-92, 46], [-97, 48], [-102, 49], [-110, 49],
  [-115, 48], [-120, 49], [-122, 50], [-125, 52], [-128, 54], [-132, 56],
  [-140, 58], [-148, 60], [-158, 62], [-168, 65],
];

const GREENLAND: [number, number][] = [
  [-48, 60], [-42, 62], [-28, 64], [-20, 68], [-18, 72], [-22, 78],
  [-30, 82], [-42, 83], [-52, 78], [-58, 72], [-55, 65], [-48, 60],
];

const SOUTH_AMERICA: [number, number][] = [
  [-81, 12], [-79, 9], [-77, 8], [-72, 10], [-65, 10], [-58, 8], [-52, 5],
  [-48, 2], [-44, 0], [-40, -2], [-38, -5], [-35, -8], [-38, -12],
  [-42, -18], [-45, -23], [-48, -28], [-52, -33], [-56, -38], [-62, -42],
  [-68, -46], [-72, -50], [-74, -52], [-73, -48], [-71, -42], [-70, -35],
  [-68, -28], [-70, -20], [-73, -12], [-76, -6], [-79, -2], [-81, 4],
  [-81, 12],
];

const EUROPE: [number, number][] = [
  [-10, 36], [-8, 38], [-6, 40], [-5, 43], [-4, 46], [-2, 48], [0, 50],
  [2, 51], [5, 52], [8, 54], [10, 55], [12, 56], [15, 57], [18, 58],
  [22, 59], [26, 60], [28, 62], [30, 63], [32, 60], [30, 56], [26, 52],
  [22, 48], [18, 45], [14, 43], [10, 42], [6, 41], [2, 40], [-2, 38],
  [-6, 36], [-10, 36],
];

const BRITISH_ISLES: [number, number][] = [
  [-6, 50], [-4, 52], [-3, 54], [-4, 56], [-6, 58], [-8, 56], [-6, 50],
];

const AFRICA: [number, number][] = [
  [-17, 15], [-14, 12], [-10, 10], [-5, 8], [0, 6], [5, 5], [10, 4],
  [15, 6], [20, 8], [25, 10], [30, 12], [35, 14], [38, 12], [42, 10],
  [48, 12], [51, 10], [50, 6], [45, 2], [42, -2], [38, -6], [35, -10],
  [32, -14], [28, -18], [25, -22], [22, -26], [20, -30], [18, -34],
  [16, -32], [14, -28], [12, -22], [10, -16], [8, -10], [6, -4],
  [4, 2], [2, 6], [0, 8], [-3, 10], [-6, 12], [-10, 14], [-14, 15],
  [-17, 15],
];

const ASIA: [number, number][] = [
  [25, 42], [30, 44], [35, 46], [40, 45], [45, 43], [50, 42], [55, 40],
  [60, 38], [65, 40], [70, 38], [75, 36], [80, 32], [85, 28], [90, 24],
  [95, 20], [100, 16], [105, 14], [110, 16], [115, 20], [118, 24],
  [120, 28], [122, 32], [125, 36], [128, 40], [132, 44], [136, 48],
  [140, 52], [142, 54], [145, 52], [142, 48], [138, 44], [132, 40],
  [128, 36], [124, 32], [120, 28], [115, 24], [110, 20], [105, 16],
  [100, 12], [95, 8], [90, 6], [85, 8], [80, 10], [75, 12], [70, 14],
  [65, 16], [60, 18], [55, 22], [50, 26], [45, 30], [40, 34], [35, 38],
  [30, 40], [25, 42],
];

const INDIA: [number, number][] = [
  [68, 26], [70, 22], [72, 18], [76, 14], [80, 10], [84, 8], [88, 10],
  [90, 14], [88, 18], [86, 22], [82, 26], [78, 28], [74, 28], [70, 26],
  [68, 26],
];

const SE_ASIA: [number, number][] = [
  [98, 14], [102, 10], [106, 6], [110, 2], [115, -2], [120, -4],
  [125, -2], [128, 2], [125, 6], [120, 10], [115, 12], [108, 14],
  [102, 16], [98, 14],
];

const JAPAN: [number, number][] = [
  [130, 32], [132, 34], [135, 36], [138, 38], [140, 40], [142, 42],
  [140, 40], [136, 36], [132, 34], [130, 32],
];

const AUSTRALIA: [number, number][] = [
  [114, -22], [118, -20], [122, -18], [128, -16], [134, -14], [140, -16],
  [145, -18], [150, -22], [152, -26], [150, -30], [148, -34], [144, -36],
  [138, -35], [132, -32], [128, -30], [122, -28], [118, -26], [114, -22],
];

const NEW_ZEALAND: [number, number][] = [
  [172, -42], [174, -40], [176, -38], [178, -40], [176, -44], [172, -42],
];

const ANTARCTICA: [number, number][] = [
  [-180, -66], [-120, -70], [-60, -72], [0, -70], [60, -72], [120, -70],
  [180, -66], [180, -90], [-180, -90], [-180, -66],
];

const ARCTIC: [number, number][] = [
  [-180, 90], [180, 90], [180, 76], [120, 74], [60, 76], [0, 74],
  [-60, 76], [-120, 74], [-180, 76], [-180, 90],
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
  { id: "antarctica", d: poly(ANTARCTICA), fill: POLAR, opacity: 0.6 },
  { id: "arctic", d: poly(ARCTIC), fill: POLAR, opacity: 0.5 },
];

export const EARTH_CONTINENT_IDS = EARTH_CONTINENT_PATHS.map((c) => c.id);

export const EARTH_REQUIRED_CONTINENT_IDS = [
  "north-america",
  "south-america",
  "europe",
  "africa",
  "asia",
  "australia",
  "antarctica",
  "arctic",
] as const;

export function allRequiredContinentsPresent(): boolean {
  const ids = new Set(EARTH_CONTINENT_IDS);
  return EARTH_REQUIRED_CONTINENT_IDS.every((id) => ids.has(id));
}

export function buildEarthMapSvgId(prefix: string, continentId: string): string {
  return `${prefix}-${continentId}`;
}

/** Public SVG asset path (Option B equirectangular mask) */
export const EARTH_MAP_ASSET_PATH = "/universe/world-equirectangular.svg";
