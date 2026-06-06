"use client";

import Link from "next/link";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioAdvancedFeaturesToggle } from "@/components/studio/studio-advanced-features-toggle";
import { StudioProductionSplash } from "@/components/studio/studio-production-splash";
import { StudioFeatureCard } from "@/components/studio/studio-feature-card";
import { StudioRoadmap } from "@/components/studio/studio-roadmap";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useStudioProductionUiMode } from "@/lib/studio-advanced-features";
import { brand } from "@/lib/brand";

const FEATURE_CARDS = [
  {
    titleKey: "studio.workspace.label" as const,
    descriptionKey: "studio.workspace.featureDescription" as const,
    href: "/studio/workspace",
  },
  {
    titleKey: "studio.feature.characters.title" as const,
    descriptionKey: "studio.feature.characters.description" as const,
    href: "/studio/characters",
  },
  {
    titleKey: "studio.feature.locations.title" as const,
    descriptionKey: "studio.feature.locations.description" as const,
    href: "/studio/locations",
  },
  {
    titleKey: "studio.feature.props.title" as const,
    descriptionKey: "studio.feature.props.description" as const,
    href: "/studio/props",
  },
  {
    titleKey: "studio.feature.worlds.title" as const,
    descriptionKey: "studio.feature.worlds.description" as const,
    href: "/studio/worlds",
  },
  {
    titleKey: "studio.feature.storyboards.title" as const,
    descriptionKey: "studio.feature.storyboards.description" as const,
    href: "/studio/storyboards",
  },
  {
    titleKey: "studio.feature.assets.title" as const,
    descriptionKey: "studio.feature.assets.description" as const,
    href: "/studio/assets",
  },
  {
    titleKey: "studio.feature.providers.title" as const,
    descriptionKey: "studio.feature.providers.description" as const,
    href: "/studio/providers",
  },
] as const;

const ADVANCED_ONLY_HREFS = new Set<string>([
  "/studio/worlds",
  "/studio/assets",
  "/studio/providers",
]);

export function StudioEntryPage() {
  const t = useActiveTranslator();
  const uiMode = useStudioProductionUiMode();
  const featureCards = FEATURE_CARDS.filter(
    (card) => uiMode === "advanced" || !ADVANCED_ONLY_HREFS.has(card.href)
  );

  if (uiMode === "simple") {
    return <StudioProductionSplash />;
  }

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-12 sm:px-10 sm:py-16">
        <header className="max-w-3xl">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: brand.studioGreen }}
          >
            {t("studio.label")}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            {t("studio.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
            {t("studio.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <StudioAdvancedFeaturesToggle />
            <MotionBuildDebugBadge />
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <AppCard className="flex-1 border-[#006D52]/20 bg-white/90 p-4 sm:min-w-[240px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
              {t("studio.product.motion.label")}
            </p>
            <p className="mt-1 text-sm text-zinc-600">{t("studio.product.motion.description")}</p>
            <Link
              href="/animate/instant"
              prefetch={false}
              className="mt-3 inline-block text-sm font-semibold text-[#006D52] hover:underline"
            >
              {t("studio.product.motion.link")} →
            </Link>
          </AppCard>
          <AppCard className="flex-1 border-[#0067B1]/20 bg-white/90 p-4 sm:min-w-[240px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
              {t("studio.product.studio.label")}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t("studio.product.studio.description")}
            </p>
          </AppCard>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {featureCards.map((card) => (
            <StudioFeatureCard
              key={card.href}
              titleKey={card.titleKey}
              descriptionKey={card.descriptionKey}
              href={card.href}
            />
          ))}
        </div>

        <AppCard className="mt-12 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-zinc-900">{t("studio.vision.title")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            {t("studio.vision.body")}
          </p>
          <StudioRoadmap />
        </AppCard>
      </section>
    </main>
  );
}
