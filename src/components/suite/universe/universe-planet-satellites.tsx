"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useCapabilityOrbitAngle } from "@/hooks/use-capability-orbit-angle";
import { useActiveTranslator } from "@/i18n/client";
import {
  UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX,
  UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX,
  UNIVERSE_PLANET_SATELLITE_CLASS,
  UNIVERSE_Z_CAPABILITY,
  resolveCapabilityEllipsePosition,
  resolveCapabilityLabelDepthStyle,
  resolveCapabilityOrbitAngleDeg,
} from "@/lib/universe-planet-ux";

type UniversePlanetSatellitesProps = {
  planet: UniversePlanetConfig;
  active: boolean;
  reducedMotion?: boolean;
  orbitDebug?: boolean;
};

export function UniversePlanetSatellites({
  planet,
  active,
  reducedMotion = false,
  orbitDebug = false,
}: UniversePlanetSatellitesProps) {
  const t = useActiveTranslator();
  const orbitAngleDeg = useCapabilityOrbitAngle(active, reducedMotion);

  if (!active) {
    return null;
  }

  const capabilities = planet.capabilityKeys.slice(0, 4);
  const xRadius = UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX;
  const yRadius = UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX;
  const orbitWidth = xRadius * 2 + 48;
  const orbitHeight = yRadius * 2 + 48;

  const labels = capabilities.map((key, i) => {
    const baseAngle = resolveCapabilityOrbitAngleDeg(i, capabilities.length);
    const travelAngle = baseAngle + (reducedMotion ? 0 : orbitAngleDeg);
    const pos = resolveCapabilityEllipsePosition(travelAngle, xRadius, yRadius);
    const depthStyle = resolveCapabilityLabelDepthStyle(pos.depth);
    return { key, pos, depthStyle };
  });

  const sorted = [...labels].sort((a, b) => a.depthStyle.zIndex - b.depthStyle.zIndex);

  return (
    <div
      className="universe-capability-orbit pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
      style={{
        zIndex: UNIVERSE_Z_CAPABILITY,
        width: orbitWidth,
        height: orbitHeight,
        marginLeft: -orbitWidth / 2,
        marginTop: -orbitHeight / 2,
        transformOrigin: "center center",
      }}
      aria-hidden
    >
      {orbitDebug && (
        <svg
          className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
          width={xRadius * 2 + 8}
          height={yRadius * 2 + 8}
          style={{ marginLeft: -(xRadius + 4), marginTop: -(yRadius + 4) }}
          aria-hidden
        >
          <ellipse
            cx={xRadius + 4}
            cy={yRadius + 4}
            rx={xRadius}
            ry={yRadius}
            fill="none"
            stroke="rgba(255,220,120,0.55)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
      )}

      {sorted.map(({ key, pos, depthStyle }) => (
        <span
          key={key}
          className={`${UNIVERSE_PLANET_SATELLITE_CLASS} universe-capability-orbit-label universe-glass pointer-events-none absolute left-1/2 top-1/2 inline-block max-w-[11rem] whitespace-nowrap rounded-full border px-4 py-2 text-[clamp(13px,1.65vw,16px)] font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.5)]`}
          style={{
            borderColor: `${planet.accent}88`,
            boxShadow: `0 0 18px ${planet.accent}44, 0 8px 28px rgba(0,0,0,0.45)`,
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            opacity: depthStyle.opacity,
            zIndex: depthStyle.zIndex,
            transition: reducedMotion ? undefined : "opacity 320ms ease",
          }}
        >
          {t(key)}
        </span>
      ))}
    </div>
  );
}
