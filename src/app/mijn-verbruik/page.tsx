import { redirect } from "next/navigation";
import { CustomerUsageDashboard } from "@/components/usage/customer-usage-dashboard";
import { getActiveTranslator } from "@/i18n";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadUserBillingUsage } from "@/server/billing/customer-billing-events";

export default async function MijnVerbruikPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/mijn-verbruik");
  }

  const t = await getActiveTranslator();
  let initialReport = null;
  let initialError: string | null = null;

  try {
    const { summary, rows } = await loadUserBillingUsage(user.id, "last30Days");
    initialReport = {
      generatedAt: new Date().toISOString(),
      summary,
      rows,
      filter: "last30Days" as const,
    };
  } catch (err) {
    initialError = err instanceof Error ? err.message : t("usage.loadError");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
        {t("usage.label")}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">{t("usage.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">{t("usage.intro")}</p>
      <p className="mt-2 text-xs text-zinc-500">{t("usage.privacyNote")}</p>
      <div className="mt-6">
        <CustomerUsageDashboard
          initialReport={initialReport}
          initialError={initialError}
        />
      </div>
    </main>
  );
}
