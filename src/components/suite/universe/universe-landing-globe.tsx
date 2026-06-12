"use client";

import { UniverseGlobe } from "@/components/suite/universe/universe-globe";

/** Same globe as homepage — compact, top-right on service landings. */
export function UniverseLandingGlobe() {
  return (
    <div
      className="pointer-events-none absolute right-4 top-8 hidden opacity-90 lg:block xl:right-8"
      aria-hidden="true"
      data-testid="universe-landing-globe"
    >
      <UniverseGlobe size="compact" />
    </div>
  );
}
