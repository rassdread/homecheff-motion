"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { BundleVersionBadge } from "@/lib/bundle-version-badges";

type Props = {
  badges: BundleVersionBadge[];
  className?: string;
};

const BADGE_STYLES: Partial<Record<BundleVersionBadge["id"], string>> = {
  studio: "border-violet-200 bg-violet-50 text-violet-900",
  motion: "border-sky-200 bg-sky-50 text-sky-900",
  story_mode: "border-amber-200 bg-amber-50 text-amber-950",
  transition_mode: "border-indigo-200 bg-indigo-50 text-indigo-950",
  voice: "border-emerald-200 bg-emerald-50 text-emerald-900",
  subtitles: "border-zinc-200 bg-zinc-100 text-zinc-800",
  failed: "border-red-200 bg-red-50 text-red-800",
  legacy: "border-zinc-300 bg-zinc-50 text-zinc-600",
  test: "border-orange-200 bg-orange-50 text-orange-900",
  archived: "border-zinc-300 bg-zinc-100 text-zinc-600",
};

export function BundleVersionBadges({ badges, className = "" }: Props) {
  const t = useActiveTranslator();
  if (!badges.length) {
    return null;
  }
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`.trim()}>
      {badges.map((badge) => (
        <li
          key={badge.id}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            BADGE_STYLES[badge.id] ?? "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {t(badge.labelKey as never)}
        </li>
      ))}
    </ul>
  );
}
