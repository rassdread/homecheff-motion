"use client";

import { useId, useState } from "react";
import { MotionBottomSheet } from "@/components/ui/motion-bottom-sheet";
import { useActiveTranslator } from "@/i18n/client";
import {
  formatCreativityWeightPercent,
  formatIdentityWeightPercent,
} from "@/lib/studio-asset-identity-profile";
import type { IdentityProfileLevel } from "@/types/studio-asset-identity-profile";

type Props = {
  level: IdentityProfileLevel;
  className?: string;
};

function ProfileInfoContent({ level }: { level: IdentityProfileLevel }) {
  const t = useActiveTranslator();
  const identityPct = formatIdentityWeightPercent(level);
  const creativityPct = formatCreativityWeightPercent(level);

  return (
    <div className="space-y-3 text-sm text-zinc-700">
      <p className="font-semibold text-zinc-900">
        {t(`studio.assetCreation.identityProfile.level.${level}` as never)}
      </p>
      <p>{t(`studio.assetCreation.identityProfile.info.${level}.description` as never)}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <dt className="font-semibold text-zinc-500">
            {t("studio.assetCreation.identityProfile.info.preserveLabel")}
          </dt>
          <dd className="mt-1 text-base font-semibold text-zinc-900">
            {level === "master_character"
              ? t("studio.assetCreation.identityProfile.info.masterCharacterPreserveRange")
              : `${identityPct}%`}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <dt className="font-semibold text-zinc-500">
            {t("studio.assetCreation.identityProfile.info.creativityLabel")}
          </dt>
          <dd className="mt-1 text-base font-semibold text-zinc-900">{creativityPct}%</dd>
        </div>
      </dl>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.assetCreation.identityProfile.info.recommendedUse")}
        </p>
        <p className="mt-1">{t(`studio.assetCreation.identityProfile.info.${level}.use` as never)}</p>
      </div>
      {level === "master_character" || level === "brand_lock" ?
        <div className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
            {t("studio.assetCreation.identityProfile.info.identityShapeMarkersTitle")}
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            {t("studio.assetCreation.identityProfile.info.identityShapeMarkersLead")}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-600">
            {(
              [
                "exampleMascotHead",
                "exampleCrown",
                "exampleTopShape",
                "exampleAntenna",
                "exampleEars",
                "exampleHorns",
                "exampleBrandedHead",
              ] as const
            ).map((key) => (
              <li key={key}>
                {t(`studio.assetCreation.identityProfile.info.identityShapeMarkers.${key}` as never)}
              </li>
            ))}
          </ul>
        </div>
      : null}
    </div>
  );
}

export function StudioIdentityProfileInfoButton({ level, className = "" }: Props) {
  const t = useActiveTranslator();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipId = useId();
  const label = t(`studio.assetCreation.identityProfile.info.buttonLabel` as never, {
    profile: t(`studio.assetCreation.identityProfile.level.${level}` as never),
  });

  return (
    <>
      <span
        className={`relative inline-flex ${className}`}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
      >
        <button
          type="button"
          aria-label={label}
          aria-expanded={tooltipOpen || sheetOpen}
          aria-describedby={tooltipOpen ? tooltipId : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (window.matchMedia("(max-width: 1023px)").matches) {
              setSheetOpen(true);
            } else {
              setTooltipOpen((open) => !open);
            }
          }}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-[10px] font-bold leading-none text-zinc-500 hover:border-[#0067B1]/40 hover:text-[#0067B1]"
        >
          ⓘ
        </button>
        {tooltipOpen ?
          <span
            id={tooltipId}
            role="tooltip"
            className="absolute bottom-full left-1/2 z-30 mb-2 hidden w-72 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg lg:block"
          >
            <ProfileInfoContent level={level} />
          </span>
        : null}
      </span>

      <MotionBottomSheet
        open={sheetOpen}
        title={t(`studio.assetCreation.identityProfile.level.${level}` as never)}
        onClose={() => setSheetOpen(false)}
      >
        <ProfileInfoContent level={level} />
      </MotionBottomSheet>
    </>
  );
}
