"use client";

import { SpaceGallery } from "@/components/examples/space-gallery";
import { listAllExamples } from "@/lib/homecheff-examples";
import { useActiveTranslator } from "@/i18n/client";
import { useMemo } from "react";

/**
 * Floating space-themed showcase carousel for the homepage.
 * Content comes from {@link listAllExamples} — same catalog as /admin/examples (home tab).
 */
export function UniverseHomeSpaceShowcase() {
  const t = useActiveTranslator();
  const examples = useMemo(() => listAllExamples(), []);

  if (examples.length === 0) {
    return null;
  }

  return (
    <section
      className="home-space-showcase"
      data-testid="universe-home-space-showcase"
      aria-labelledby="universe-home-space-gallery-title"
    >
      <h2
        id="universe-home-space-gallery-title"
        className="text-center text-xl font-bold text-white sm:text-2xl"
      >
        {t("examples.gallery.title" as never)}
      </h2>
      <SpaceGallery examples={examples} />
    </section>
  );
}
