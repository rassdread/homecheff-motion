import type { PhotoVideoResolvedTransition } from "@/lib/photo-video/transition-kind";

export type TransitionPoint = { x: number; y: number };
export type TransitionPolygon = TransitionPoint[];
export type TransitionRect = { x: number; y: number; w: number; h: number };

export type TransitionClip =
  | { type: "none" }
  | { type: "rect"; rect: TransitionRect }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "pie"; cx: number; cy: number; r: number; start: number; end: number }
  | { type: "polygons"; polygons: TransitionPolygon[] }
  | { type: "path"; points: TransitionPoint[] };

export type TransitionSample = {
  kind: PhotoVideoResolvedTransition;
  progress: number;
  incomingAlpha: number;
  outgoingAlpha: number;
  incomingOffsetX: number;
  incomingOffsetY: number;
  incomingScale: number;
  outgoingOffsetX: number;
  outgoingScale: number;
  outgoingRotate: number;
  incomingClip: TransitionClip;
  outgoingClip: TransitionClip;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function easeSmooth(progress: number): number {
  const t = clamp01(progress);
  return t * t * (3 - 2 * t);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyIncoming(kind: PhotoVideoResolvedTransition, progress: number): TransitionSample {
  return {
    kind,
    progress: clamp01(progress),
    incomingAlpha: 0,
    outgoingAlpha: 1,
    incomingOffsetX: 0,
    incomingOffsetY: 0,
    incomingScale: 1,
    outgoingOffsetX: 0,
    outgoingScale: 1,
    outgoingRotate: 0,
    incomingClip: { type: "none" },
    outgoingClip: { type: "none" },
  };
}

function fullIncoming(kind: PhotoVideoResolvedTransition, progress: number): TransitionSample {
  return {
    ...emptyIncoming(kind, progress),
    incomingAlpha: 1,
    outgoingAlpha: 0,
  };
}

function shardPolys(width: number, height: number, seed: number): TransitionPolygon[] {
  const cols = 4;
  const rows = 3;
  const rand = mulberry32(seed || 1);
  const xs = Array.from({ length: cols + 1 }, (_, i) => (i / cols) * width);
  const ys = Array.from({ length: rows + 1 }, (_, j) => (j / rows) * height);
  const pts: TransitionPoint[][] = ys.map((y, j) =>
    xs.map((x, i) => {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      if (edge) return { x, y };
      return {
        x: x + (rand() - 0.5) * (width / cols) * 0.35,
        y: y + (rand() - 0.5) * (height / rows) * 0.35,
      };
    })
  );
  const polygons: TransitionPolygon[] = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      polygons.push([pts[j]![i]!, pts[j]![i + 1]!, pts[j + 1]![i + 1]!, pts[j + 1]![i]!]);
    }
  }
  return polygons;
}

function tileRects(width: number, height: number): TransitionRect[] {
  const cols = 4;
  const rows = 6;
  const tw = width / cols;
  const th = height / rows;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const cells: { rect: TransitionRect; order: number }[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const dist = Math.abs(x - cx) + Math.abs(y - cy);
      cells.push({
        rect: { x: x * tw, y: y * th, w: tw + 0.5, h: th + 0.5 },
        order: dist + x * 0.02 + y * 0.01,
      });
    }
  }
  return cells.sort((a, b) => a.order - b.order).map((cell) => cell.rect);
}

function wavePoints(width: number, height: number, progress: number): TransitionPoint[] {
  const amp = Math.min(width, height) * 0.06;
  const edge = easeSmooth(progress) * (width + amp * 2) - amp;
  const points: TransitionPoint[] = [{ x: -1, y: -1 }];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const y = (i / steps) * height;
    const x = edge + amp * Math.sin((y / Math.max(28, height / 18)) + progress * 5);
    points.push({ x, y });
  }
  points.push({ x: -1, y: height + 1 });
  return points;
}

export function sampleTransition(
  kind: PhotoVideoResolvedTransition,
  progress: number,
  width: number,
  height: number,
  seed = 1
): TransitionSample {
  const p = clamp01(progress);
  const e = easeSmooth(p);
  if (p <= 0) return emptyIncoming(kind, p);
  if (p >= 1) return fullIncoming(kind, p);

  if (kind === "cut") {
    return p < 1 ? emptyIncoming(kind, p) : fullIncoming(kind, p);
  }

  if (kind === "fade") {
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: e,
      outgoingAlpha: 1,
    };
  }

  if (kind === "slide") {
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      incomingOffsetX: (1 - e) * width,
      outgoingOffsetX: -e * width * 0.28,
    };
  }

  if (kind === "wipe") {
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      incomingClip: { type: "rect", rect: { x: 0, y: 0, w: Math.max(1, e * width), h: height } },
    };
  }

  if (kind === "zoom_blend") {
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: e,
      outgoingAlpha: 1 - e * 0.35,
      incomingScale: 1.08 - e * 0.08,
      outgoingScale: 1 + e * 0.06,
    };
  }

  if (kind === "hc_shards") {
    const polys = shardPolys(width, height, seed);
    const remaining: TransitionPolygon[] = [];
    for (let i = 0; i < polys.length; i += 1) {
      const delay = (i / Math.max(1, polys.length)) * 0.42;
      const local = clamp01((p - delay) / Math.max(0.2, 1 - delay));
      if (local >= 1) continue;
      const drift = local * Math.min(width, height) * 0.08;
      remaining.push(
        polys[i]!.map((pt) => ({
          x: pt.x + drift * (i % 2 === 0 ? 1 : -0.6),
          y: pt.y + drift * 0.4,
        }))
      );
    }
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: remaining.length ? 1 : 0,
      outgoingClip: remaining.length ? { type: "polygons", polygons: remaining } : { type: "none" },
      outgoingRotate: e * 0.04,
    };
  }

  if (kind === "hc_tiles") {
    const tiles = tileRects(width, height);
    const revealed = tiles.filter((_, i) => p > i / Math.max(1, tiles.length));
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      incomingClip: revealed.length
        ? { type: "polygons", polygons: revealed.map((r) => [
            { x: r.x, y: r.y },
            { x: r.x + r.w, y: r.y },
            { x: r.x + r.w, y: r.y + r.h },
            { x: r.x, y: r.y + r.h },
          ]) }
        : { type: "none" },
    };
  }

  if (kind === "hc_orbit") {
    const r = Math.hypot(width, height) * 0.72;
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      incomingClip: {
        type: "pie",
        cx: width / 2,
        cy: height / 2,
        r,
        start: -Math.PI / 2,
        end: -Math.PI / 2 + e * Math.PI * 2,
      },
      outgoingRotate: (1 - e) * 0.06,
      outgoingScale: 1 + (1 - e) * 0.03,
    };
  }

  if (kind === "hc_split") {
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      outgoingOffsetX: e * width * 0.42,
    };
  }

  if (kind === "hc_strips") {
    const cols = 8;
    const tw = width / cols;
    const revealed: TransitionPolygon[] = [];
    for (let i = 0; i < cols; i += 1) {
      const delay = (i / Math.max(1, cols)) * 0.45;
      if (p <= delay) continue;
      revealed.push([
        { x: i * tw, y: 0 },
        { x: i * tw + tw + 0.5, y: 0 },
        { x: i * tw + tw + 0.5, y: height },
        { x: i * tw, y: height },
      ]);
    }
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      incomingClip: revealed.length ? { type: "polygons", polygons: revealed } : { type: "none" },
    };
  }

  if (kind === "hc_lens") {
    return {
      ...emptyIncoming(kind, p),
      incomingAlpha: 1,
      outgoingAlpha: 1,
      incomingClip: {
        type: "circle",
        cx: width / 2,
        cy: height / 2,
        r: e * Math.hypot(width, height) * 0.72,
      },
    };
  }

  const points = wavePoints(width, height, p);
  return {
    ...emptyIncoming(kind, p),
    incomingAlpha: 1,
    outgoingAlpha: 1,
    incomingClip: { type: "path", points },
  };
}
