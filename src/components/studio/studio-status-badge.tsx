"use client";

import { useActiveTranslator } from "@/i18n/client";

export type StudioBadgeKind = "alpha" | "comingSoon" | "planned";

const BADGE_STYLES: Record<StudioBadgeKind, string> = {
  alpha: "border-[#006D52]/30 bg-[#006D52]/10 text-[#006D52]",
  comingSoon: "border-[#0067B1]/30 bg-[#0067B1]/10 text-[#0067B1]",
  planned: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

const BADGE_KEYS: Record<StudioBadgeKind, "studio.badge.alpha" | "studio.badge.comingSoon" | "studio.badge.planned"> = {
  alpha: "studio.badge.alpha",
  comingSoon: "studio.badge.comingSoon",
  planned: "studio.badge.planned",
};

type StudioStatusBadgeProps = {
  kind: StudioBadgeKind;
  className?: string;
};

export function StudioStatusBadge({ kind, className = "" }: StudioStatusBadgeProps) {
  const t = useActiveTranslator();

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${BADGE_STYLES[kind]} ${className}`}
    >
      {t(BADGE_KEYS[kind])}
    </span>
  );
}
