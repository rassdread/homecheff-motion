import { StudioAccountDashboard } from "@/components/account/studio-account-dashboard";
import { getActiveTranslator } from "@/i18n";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadStudioAccountOverview } from "@/server/studio-account/studio-account-service";

export default async function AccountCreditsPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const t = await getActiveTranslator();
  const overview = await loadStudioAccountOverview(user.id, user.email);

  return (
    <div className="space-y-4">
      <div className={`${studioVisual.cardOnDark} p-5`}>
        <h2 className="text-lg font-semibold text-white">{t("account.credits.pageTitle")}</h2>
        <p className="mt-2 text-sm text-white/60">{t("account.credits.pageIntro")}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-white/50">{t("account.credits.lifetimePurchased")}</dt>
            <dd className="font-medium text-white">{overview.wallet.lifetimePurchased.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-white/50">{t("account.credits.lifetimeGranted")}</dt>
            <dd className="font-medium text-white">{overview.wallet.lifetimeGranted.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-white/50">{t("account.credits.lifetimeSpent")}</dt>
            <dd className="font-medium text-white">{overview.wallet.lifetimeSpent.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-white/50">{t("account.credits.lifetimeRefunded")}</dt>
            <dd className="font-medium text-white">{overview.wallet.lifetimeRefunded.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <StudioAccountDashboard initial={overview} showLedger />
    </div>
  );
}
