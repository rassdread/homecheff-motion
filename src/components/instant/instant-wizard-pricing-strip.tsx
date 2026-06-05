"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  estimatedPriceLabel: string;
  imageCount: number;
  transitionCount: number;
  durationSeconds: number;
  isAdminFree: boolean;
  isAdmin: boolean;
  usesFreeGeneration: boolean;
};

export function InstantWizardPricingStrip({
  estimatedPriceLabel,
  imageCount,
  transitionCount,
  durationSeconds,
  isAdminFree,
  isAdmin,
  usesFreeGeneration,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
        <p className="text-sm font-semibold text-emerald-950">
          {t("instant.pricing.estimated", { price: estimatedPriceLabel })}
        </p>
        <p className="text-xs text-emerald-900/80">
          {t("instant.wizardStatus.summary", {
            images: imageCount,
            transitions: transitionCount,
            seconds: durationSeconds,
          })}
        </p>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-emerald-900/70 sm:text-xs">
        {t("instant.pricing.creditsBasedNote")}
      </p>
      {isAdminFree || isAdmin ? (
        <p className="mt-1 text-[11px] font-medium text-amber-900 sm:text-xs">
          {usesFreeGeneration ? t("instant.pricing.adminTestMode") : t("instant.step7.testModeHelp")}
        </p>
      ) : null}
    </div>
  );
}
