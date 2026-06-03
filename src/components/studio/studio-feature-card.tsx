"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { StudioStatusBadge } from "@/components/studio/studio-status-badge";

type StudioFeatureCardProps = {
  titleKey: "studio.feature.characters.title" | "studio.feature.locations.title" | "studio.feature.props.title" | "studio.feature.storyboards.title";
  descriptionKey:
    | "studio.feature.characters.description"
    | "studio.feature.locations.description"
    | "studio.feature.props.description"
    | "studio.feature.storyboards.description";
  href: string;
};

export function StudioFeatureCard({
  titleKey,
  descriptionKey,
  href,
}: StudioFeatureCardProps) {
  const t = useActiveTranslator();

  return (
    <AppCard className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-900">{t(titleKey)}</h3>
        <StudioStatusBadge kind="alpha" />
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
        {t(descriptionKey)}
      </p>
      <Link
        href={href}
        prefetch={false}
        className="mt-5 inline-flex w-fit items-center justify-center rounded-full border border-[#0067B1]/40 bg-white px-4 py-2 text-sm font-semibold text-[#0067B1] transition-colors hover:bg-[#0067B1]/5"
      >
        {t("studio.card.open")}
      </Link>
    </AppCard>
  );
}
