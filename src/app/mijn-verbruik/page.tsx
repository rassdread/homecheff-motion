import { ProductPageShell } from "@/components/layout/product-page-shell";
import { CustomerUsageDashboard } from "@/components/usage/customer-usage-dashboard";
import { getActiveTranslator } from "@/i18n";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { getAuthenticatedUser } from "@/server/auth/session";
import {
  emptyUserUsageSummary,
  loadUserBillingUsage,
} from "@/server/billing/customer-billing-events";
import type { CustomerUsageReport } from "@/types/customer-usage";

export default async function MijnVerbruikPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate("/mijn-verbruik");
  }
  const sessionUser = user!;

  const t = await getActiveTranslator();
  let initialReport: CustomerUsageReport | null = null;
  let initialError: string | null = null;

  try {
    const { summary, rows } = await loadUserBillingUsage(sessionUser.id, "last30Days");
    initialReport = {
      generatedAt: new Date().toISOString(),
      summary,
      rows,
      filter: "last30Days" as const,
    };
  } catch {
    initialReport = {
      generatedAt: new Date().toISOString(),
      summary: emptyUserUsageSummary("last30Days"),
      rows: [],
      filter: "last30Days",
    };
    initialError = t("usage.loadError");
  }

  return (
    <ProductPageShell>
      <p className={studioVisual.eyebrowOnDark}>{t("usage.label")}</p>
      <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{t("usage.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{t("usage.intro")}</p>
      <p className="mt-2 text-xs text-white/50">{t("usage.privacyNote")}</p>
      <div className="mt-6">
        <CustomerUsageDashboard
          initialReport={initialReport}
          initialError={initialError}
        />
      </div>
    </ProductPageShell>
  );
}
