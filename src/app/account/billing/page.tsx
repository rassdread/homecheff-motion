import { Suspense } from "react";
import { StudioUnifiedBillingDashboard } from "@/components/account/studio-unified-billing-dashboard";
import { getActiveTranslator } from "@/i18n";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadStudioAccountOverview } from "@/server/studio-account/studio-account-service";
import { getPlanBenefits } from "@/server/studio-account/studio-billing-policy-service";

export default async function AccountBillingPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const t = await getActiveTranslator();
  const overview = await loadStudioAccountOverview(user.id, user.email);
  const planBenefits = await getPlanBenefits(overview.account.studioPlan);

  return (
    <div className="space-y-4">
      <div className={`${studioVisual.cardOnDark} p-5`}>
        <h2 className="text-lg font-semibold text-white">{t("account.billing.pageTitle")}</h2>
        <p className="mt-2 text-sm text-white/60">
          {t("account.billing.pageIntro", { percent: planBenefits.creditDiscountPercent })}
        </p>
      </div>
      <Suspense
        fallback={
          <div className={`${studioVisual.cardOnDark} p-5 text-sm text-white/60`}>
            {t("account.billing.loading")}
          </div>
        }
      >
        <StudioUnifiedBillingDashboard
          initial={overview}
          planDiscountPercent={planBenefits.creditDiscountPercent}
        />
      </Suspense>
    </div>
  );
}
