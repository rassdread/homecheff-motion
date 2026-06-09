"use client";

import type { UniversePlanetId } from "@/lib/universe-home-config";
import { UniverseSaturnRing, UniverseSaturnRingFront } from "@/components/suite/universe/universe-saturn-ring";

type Props = {
  planetId: UniversePlanetId;
  active?: boolean;
  reducedMotion?: boolean;
  variant?: "orbit" | "band";
  layer?: "back" | "front" | "full";
};

/** Saturn-style product identity ring — replaces circular textPath spinner */
export function UniversePlanetIdentityRing({
  planetId,
  active = false,
  reducedMotion = false,
  variant = "orbit",
  layer = "full",
}: Props) {
  if (layer === "back") {
    return (
      <UniverseSaturnRing
        planetId={planetId}
        active={active}
        reducedMotion={reducedMotion}
        variant={variant}
      />
    );
  }

  if (layer === "front") {
    return (
      <UniverseSaturnRingFront
        planetId={planetId}
        active={active}
        reducedMotion={reducedMotion}
      />
    );
  }

  if (variant === "band") {
    return (
      <UniverseSaturnRing
        planetId={planetId}
        active={active}
        reducedMotion={reducedMotion}
        variant="band"
      />
    );
  }

  return (
    <>
      <UniverseSaturnRing
        planetId={planetId}
        active={active}
        reducedMotion={reducedMotion}
        variant="orbit"
      />
      <UniverseSaturnRingFront
        planetId={planetId}
        active={active}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
