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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">{t("usage.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("usage.intro")}</p>
      <div className="mt-6">
        <CustomerUsageDashboard
          initialReport={initialReport}
          initialError={initialError}
        />
      </div>
    </main>
  );
}
