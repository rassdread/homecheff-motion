"use client";

import { SpaceGallery } from "@/components/examples/space-gallery";
import { useShowcaseCtaAction } from "@/hooks/use-showcase-cta-action";
import { useShowcaseExamples } from "@/hooks/use-showcase-examples";
import { useActiveTranslator } from "@/i18n/client";
import type { ShowcasePageKey } from "@/types/studio-showcase-item";

type Props = {
  pageKey?: ShowcasePageKey;
};

/**
 * Floating space-themed showcase carousel.
 * Content from admin-managed {@link StudioShowcaseItem} via /api/showcase-items,
 * with global and static HOMECHEFF_EXAMPLES fallbacks.
 */
export function UniverseHomeSpaceShowcase({ pageKey = "home" }: Props) {
  const t = useActiveTranslator();
  const { examples, loading } = useShowcaseExamples(pageKey);
  const onCtaClick = useShowcaseCtaAction();

  if (loading || examples.length === 0) {
    return null;
  }

  return (
    <section
      className="home-space-showcase"
      data-testid="universe-home-space-showcase"
      data-showcase-page-key={pageKey}
      aria-labelledby="universe-home-space-gallery-title"
    >
      <h2
        id="universe-home-space-gallery-title"
        className="text-center text-xl font-bold text-white sm:text-2xl"
      >
        {t("examples.gallery.title" as never)}
      </h2>
      <SpaceGallery examples={examples} onCtaClick={onCtaClick} />
    </section>
  );
}
