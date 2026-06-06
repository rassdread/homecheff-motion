"use client";

import Link from "next/link";
import { MotionBuildDebugBadge } from "@/components/layout/motion-build-debug-badge";
import { StudioAdvancedFeaturesToggle } from "@/components/studio/studio-advanced-features-toggle";
import { StudioFeatureCard } from "@/components/studio/studio-feature-card";
import { StudioRoadmap } from "@/components/studio/studio-roadmap";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

const FEATURE_CARDS = [
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

/** Legacy developer / power-user hub — not the primary Studio flow. */
export function StudioAdvancedHubPage() {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-12 sm:px-10 sm:py-16">
        <Link href="/studio" className="text-sm font-medium text-[#006D52] hover:underline">
          ← {t("studio.shell.backToEditor")}
        </Link>
        <header className="mt-4 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t("studio.shell.advancedHubLabel")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{t("studio.title")}</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{t("studio.shell.advancedHubSubtitle")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <StudioAdvancedFeaturesToggle />
            <MotionBuildDebugBadge />
          </div>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURE_CARDS.map((card) => (
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
