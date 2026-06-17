"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  estimatedCredits: number;
  availableCredits?: number;
  compact?: boolean;
};

export function ActionCostPreview({ estimatedCredits, availableCredits, compact = false }: Props) {
  const t = useActiveTranslator();
  const insufficient =
    availableCredits != null && estimatedCredits > 0 && availableCredits < estimatedCredits;

  if (estimatedCredits <= 0) {
    return null;
  }

  return (
    <p
      className={`${compact ? "text-xs" : "text-sm"} ${
        insufficient ? "font-medium text-amber-800" : "text-zinc-600"
      }`}
      data-testid="action-cost-preview"
    >
      {t("billing.conversion.estimatedCost", { credits: estimatedCredits })}
      {availableCredits != null
        ? ` · ${t("billing.conversion.availableShort", { credits: availableCredits })}`
        : null}
    </p>
  );
}
