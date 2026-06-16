"use client";

import { UniverseHomePage } from "@/components/suite/universe/universe-home-page";

/**
 * Canonical "/" page — always UniverseHomePage.
 * Auth changes homepage content (hero copy, sections), never the shell or component.
 */
export function HomePage() {
  return <UniverseHomePage />;
}
