"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { StudioStatusBadge } from "@/components/studio/studio-status-badge";

type StudioPlaceholderPageProps = {
  titleKey:
    | "studio.placeholder.characters.title"
    | "studio.placeholder.locations.title"
    | "studio.placeholder.props.title"
    | "studio.placeholder.storyboards.title";
  descriptionKey:
    | "studio.placeholder.characters.description"
    | "studio.placeholder.locations.description"
    | "studio.placeholder.props.description"
    | "studio.placeholder.storyboards.description";
};

export function StudioPlaceholderPage({
  titleKey,
  descriptionKey,
}: StudioPlaceholderPageProps) {
  const t = useActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto flex w-full max-w-3xl flex-col px-6 py-12 sm:px-10 sm:py-16">
        <AppCard className="bg-white p-8 text-center sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {t(titleKey)}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
            {t(descriptionKey)}
          </p>
          <div className="mt-6 flex justify-center">
            <StudioStatusBadge kind="comingSoon" className="px-4 py-1 text-xs" />
          </div>
          <Link
            href="/studio"
            prefetch={false}
            className="mt-8 inline-flex items-center justify-center rounded-full border border-[#006D52]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#006D52] transition-colors hover:bg-[#006D52]/5"
          >
            {t("studio.placeholder.back")}
          </Link>
        </AppCard>
      </section>
    </main>
  );
}
