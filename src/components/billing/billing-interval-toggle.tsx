"use client";

import { useActiveTranslator } from "@/i18n/client";
import { SUBSCRIPTION_YEARLY_SAVINGS_PERCENT } from "@/lib/studio-subscription-billing";
import type { SubscriptionBillingInterval } from "@/lib/studio-subscription-billing";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";

type Props = {
  value: SubscriptionBillingInterval;
  onChange: (interval: SubscriptionBillingInterval) => void;
  theme?: "light" | "dark";
  className?: string;
};

export function BillingIntervalToggle({
  value,
  onChange,
  theme = "light",
  className = "",
}: Props) {
  const t = useActiveTranslator();

  const select = (interval: SubscriptionBillingInterval) => {
    if (interval === value) {
      return;
    }
    onChange(interval);
    trackBillingConversionEvent(interval === "yearly" ? "yearly_selected" : "monthly_selected", {
      source: "billing_interval_toggle",
    });
  };

  const baseBtn =
    theme === "dark"
      ? "rounded-full px-4 py-2 text-sm font-medium transition-colors"
      : "rounded-full px-4 py-2 text-sm font-medium transition-colors";
  const active =
    theme === "dark"
      ? "bg-emerald-600 text-white shadow-sm"
      : "bg-[#006D52] text-white shadow-sm";
  const inactive =
    theme === "dark"
      ? "text-white/70 hover:bg-white/10"
      : "text-zinc-600 hover:bg-zinc-100";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border p-1 ${
        theme === "dark" ? "border-white/15 bg-white/5" : "border-zinc-200 bg-zinc-50"
      } ${className}`}
      role="group"
      aria-label={t("billing.interval.toggleLabel" as never)}
    >
      <button
        type="button"
        className={`${baseBtn} ${value === "monthly" ? active : inactive}`}
        aria-pressed={value === "monthly"}
        onClick={() => select("monthly")}
      >
        {t("billing.interval.monthly" as never)}
      </button>
      <button
        type="button"
        className={`${baseBtn} ${value === "yearly" ? active : inactive}`}
        aria-pressed={value === "yearly"}
        onClick={() => select("yearly")}
      >
        {t("billing.interval.yearlySave" as never, { percent: SUBSCRIPTION_YEARLY_SAVINGS_PERCENT })}
      </button>
    </div>
  );
}
