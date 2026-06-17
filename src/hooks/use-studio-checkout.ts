"use client";

import { useCallback, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";

export function useStudioCheckout(returnPath = "/account/billing") {
  const t = useActiveTranslator();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (type: "subscription" | "credit_pack", id: string, promoCode?: string) => {
      setLoadingPackId(id);
      setError(null);
      if (type === "credit_pack") {
        trackBillingConversionEvent("credit_pack_selected", { packId: id, source: "checkout" });
      } else {
        trackBillingConversionEvent("subscription_upgrade_selected", { planId: id, source: "checkout" });
      }
      try {
        const res = await fetch("/api/me/studio-credits/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            planId: type === "subscription" ? id : undefined,
            packId: type === "credit_pack" ? id : undefined,
            returnPath,
            promoCode: promoCode?.trim() || undefined,
          }),
        });
        const data = (await res.json()) as { url?: string; error?: string; code?: string };
        if (!res.ok) {
          setError(
            data.code === "STRIPE_NOT_CONFIGURED"
              ? t("account.billing.stripeNotConfigured")
              : (data.error ?? t("account.billing.checkoutError"))
          );
          return;
        }
        if (data.url) {
          window.location.href = data.url;
        }
      } finally {
        setLoadingPackId(null);
      }
    },
    [returnPath, t]
  );

  return { startCheckout, loadingPackId, error, setError };
}
