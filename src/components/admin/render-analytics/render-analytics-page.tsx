"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { RenderAnalyticsReport } from "@/types/render-analytics";
import { RenderAnalyticsDashboard } from "@/components/admin/render-analytics/render-analytics-dashboard";

type RenderAnalyticsPageProps = {
  initialReport: RenderAnalyticsReport | null;
  initialError: string | null;
};

export function RenderAnalyticsPage({ initialReport, initialError }: RenderAnalyticsPageProps) {
  const t = useActiveTranslator();

  return (
    <main>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("admin.renderAnalytics.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("admin.renderAnalytics.intro")}</p>
      <div className="mt-8">
        <RenderAnalyticsDashboard initialReport={initialReport} initialError={initialError} />
      </div>
    </main>
  );
}
