/** Equirectangular map size (2:1) */
export const EARTH_MAP_WIDTH = 720;
export const EARTH_MAP_HEIGHT = 360;

const GREEN = "#006D52";
const TEAL = "#0a8a6f";

/** Simplified recognisable Earth continents — equirectangular projection */
export const EARTH_CONTINENT_PATHS: { id: string; d: string; fill?: string }[] = [
  {
    id: "north-america",
    d: "M52 72 C68 58 88 52 108 58 C128 64 142 78 148 96 C154 112 148 128 132 138 C118 146 98 148 82 142 C66 136 52 122 48 104 C46 90 48 80 52 72 Z M118 96 C128 88 142 92 148 104 C152 116 144 128 130 132 C118 134 108 124 106 110 C105 102 110 98 118 96 Z",
    fill: GREEN,
  },
  {
    id: "south-america",
    d: "M128 148 C142 142 152 152 156 168 C160 188 154 208 142 222 C130 234 118 232 112 218 C106 200 108 178 116 162 C120 152 124 150 128 148 Z",
    fill: TEAL,
  },
  {
    id: "europe",
    d: "M338 78 C352 72 366 76 372 86 C378 96 372 106 360 110 C348 114 336 108 332 98 C328 88 332 82 338 78 Z M348 68 C358 64 368 68 372 76 C374 82 368 88 358 88 C350 86 346 74 348 68 Z",
    fill: GREEN,
  },
  {
    id: "africa",
    d: "M352 108 C368 102 382 110 388 128 C394 148 390 172 378 192 C366 210 352 218 342 208 C332 196 330 168 336 142 C340 122 344 112 352 108 Z",
    fill: TEAL,
  },
  {
    id: "asia",
    d: "M392 52 C438 42 488 48 528 62 C558 72 578 88 572 108 C566 128 538 138 498 134 C458 128 418 112 398 92 C386 76 384 60 392 52 Z M468 108 C492 112 508 128 504 146 C500 162 482 170 464 162 C448 154 444 132 454 118 C460 110 464 108 468 108 Z M548 78 C562 74 574 80 578 90 C580 98 572 104 560 102 C550 98 546 86 548 78 Z",
    fill: GREEN,
  },
  {
    id: "australia",
    d: "M568 198 C592 192 612 198 620 210 C628 222 618 234 598 236 C578 236 562 226 558 214 C556 206 560 200 568 198 Z",
    fill: TEAL,
  },
  {
    id: "greenland",
    d: "M168 48 C188 40 208 44 218 58 C224 70 214 82 196 84 C178 84 162 72 160 58 C159 52 164 50 168 48 Z",
    fill: GREEN,
  },
];

export const EARTH_MAP_SCROLL_WIDTH = EARTH_MAP_WIDTH;

export function buildEarthMapSvgId(prefix: string, continentId: string): string {
  return `${prefix}-${continentId}`;
}
