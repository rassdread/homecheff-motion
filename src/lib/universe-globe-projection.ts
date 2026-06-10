/** Shared orthographic globe projection — continents, nodes, routes, labels */

export const UNIVERSE_GLOBE_ROTATION_DURATION_MS = 24_000;
export const UNIVERSE_GLOBE_ROTATION_DURATION_FOCUSED_MS = 30_000;
export const UNIVERSE_GLOBE_ROTATION_DURATION_REDUCED_MS = 120_000;

export const UNIVERSE_GLOBE_DEFAULT_ROTATION_DEG = 10;
export const UNIVERSE_GLOBE_VISIBLE_Z_THRESHOLD = 0.05;
export const UNIVERSE_GLOBE_OVERLAY_RADIUS = 44;
export const UNIVERSE_GLOBE_VIEW_CENTER = 50;

export type GlobeProjectedPoint = {
  x: number;
  y: number;
  z: number;
  visible: boolean;
  scale: number;
  opacity: number;
};

export type ProjectLatLonToGlobePointInput = {
  lat: number;
  lon: number;
  rotationDeg: number;
  radius?: number;
};

/**
 * Orthographic projection onto a front-facing hemisphere.
 * rotationDeg = central meridian longitude at the front of the globe.
 */
export function projectLatLonToGlobePoint({
  lat,
  lon,
  rotationDeg,
  radius = UNIVERSE_GLOBE_OVERLAY_RADIUS,
}: ProjectLatLonToGlobePointInput): GlobeProjectedPoint {
  const λ = ((lon - rotationDeg) * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const cosφ = Math.cos(φ);
  const sinφ = Math.sin(φ);
  const sinλ = Math.sin(λ);
  const cosλ = Math.cos(λ);

  const x3 = cosφ * sinλ;
  const y3 = sinφ;
  const z3 = cosφ * cosλ;

  const visible = z3 > UNIVERSE_GLOBE_VISIBLE_Z_THRESHOLD;
  const scale = 0.35 + 0.65 * Math.max(0, Math.min(1, z3));

  let opacity = 0;
  if (visible) {
    if (z3 < 0.2) {
      opacity =
        ((z3 - UNIVERSE_GLOBE_VISIBLE_Z_THRESHOLD) /
          (0.2 - UNIVERSE_GLOBE_VISIBLE_Z_THRESHOLD)) *
        scale;
    } else {
      opacity = scale;
    }
    opacity = Math.min(1, Math.max(0, opacity));
  }

  return {
    x: UNIVERSE_GLOBE_VIEW_CENTER + x3 * radius,
    y: UNIVERSE_GLOBE_VIEW_CENTER - y3 * radius,
    z: z3,
    visible,
    scale,
    opacity,
  };
}

/** Equirectangular map layer offset — sync with rotationDeg (200% duplicated strip) */
export function resolveGlobeMapTranslatePercent(rotationDeg: number): number {
  return -(rotationDeg / 360) * 50;
}

export function shouldDrawGlobeRoute(
  from: GlobeProjectedPoint,
  to: GlobeProjectedPoint
): boolean {
  return (
    from.visible &&
    to.visible &&
    from.opacity > 0.12 &&
    to.opacity > 0.12 &&
    from.z > UNIVERSE_GLOBE_VISIBLE_Z_THRESHOLD &&
    to.z > UNIVERSE_GLOBE_VISIBLE_Z_THRESHOLD
  );
}

export function buildGlobeRoutePath(
  from: GlobeProjectedPoint,
  to: GlobeProjectedPoint
): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const lift = 0.18;
  const ctrlX = UNIVERSE_GLOBE_VIEW_CENTER + (midX - UNIVERSE_GLOBE_VIEW_CENTER) * (1 - lift);
  const ctrlY = UNIVERSE_GLOBE_VIEW_CENTER + (midY - UNIVERSE_GLOBE_VIEW_CENTER) * (1 - lift);
  return `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`;
}

export function resolveGlobeRouteOpacity(
  from: GlobeProjectedPoint,
  to: GlobeProjectedPoint
): number {
  return Math.min(from.opacity, to.opacity) * 0.32;
}

export function resolveGlobeNodeLabelOpacity(
  point: GlobeProjectedPoint,
  focused: boolean,
  _tier: 1 | 2 | 3
): number {
  if (!focused || !point.visible || point.opacity < 0.28) return 0;
  return Math.min(0.9, point.opacity * 0.85);
}

export function distanceBetweenProjectedPoints(
  a: GlobeProjectedPoint,
  b: GlobeProjectedPoint
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function resolveUniverseGlobeProjectionDebug(
  raw: string | null | undefined
): boolean {
  return raw === "1" || raw === "true" || raw === "projection";
}
