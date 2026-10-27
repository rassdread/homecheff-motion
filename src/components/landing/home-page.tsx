"use client";

import { StudioUnifiedHomePage } from "@/components/studio/studio-unified-home-page";

/**
 * Canonical "/" page — the same Studio home as /studio.
 * Auth does not swap this component.
 */
export function HomePage() {
  return <StudioUnifiedHomePage />;
}
