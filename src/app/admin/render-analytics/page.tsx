import { RenderAnalyticsPage } from "@/components/admin/render-analytics/render-analytics-page";
import { getRenderAnalyticsReport } from "@/server/admin/render-analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function AdminRenderAnalyticsPage() {
  let report = null;
  let error: string | null = null;

  try {
    report = await getRenderAnalyticsReport();
  } catch (err) {
    error = err instanceof Error ? err.message : "Render analytics failed";
    console.error("[admin/render-analytics/page]", error);
  }

  return <RenderAnalyticsPage initialReport={report} initialError={error} />;
}
