"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

export type StudioSourceBadgeKind =
  | "studio_source"
  | "motion_override"
  | "protected"
  | "generated";

const BADGE_STYLE: Record<StudioSourceBadgeKind, string> = {
  studio_source: "border-[#0067B1]/30 bg-[#0067B1]/10 text-[#0067B1]",
  motion_override: "border-amber-300/70 bg-amber-50 text-amber-950",
  protected: "border-[#006D52]/30 bg-[#006D52]/10 text-[#006D52]",
  generated: "border-violet-300/70 bg-violet-50 text-violet-900",
};

const BADGE_I18N: Record<StudioSourceBadgeKind, TranslationKey> = {
  studio_source: "studio.sourceBadge.studioSource",
  motion_override: "studio.sourceBadge.motionOverride",
  protected: "studio.sourceBadge.protected",
  generated: "studio.sourceBadge.generated",
};

type Props = {
  kind: StudioSourceBadgeKind;
  className?: string;
};

export function StudioSourceBadge({ kind, className = "" }: Props) {
  const t = useActiveTranslator();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLE[kind]} ${className}`}
    >
      {t(BADGE_I18N[kind])}
    </span>
  );
}
