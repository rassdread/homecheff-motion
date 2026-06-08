import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { loadUserBillingUsage, emptyUserUsageSummary } from "@/server/billing/customer-billing-events";
import type { CustomerUsageReport } from "@/types/customer-usage";

const FILTERS = new Set(["today", "last7Days", "last30Days", "allTime"]);

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("filter") ?? "allTime";
  const filter =
    FILTERS.has(raw) ? (raw as CustomerUsageReport["filter"]) : "allTime";

  try {
    const { summary, rows } = await loadUserBillingUsage(user.id, filter);

    const report: CustomerUsageReport = {
      generatedAt: new Date().toISOString(),
      summary,
      rows,
      filter,
    };

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error("[api/me/usage]", err);
    const report: CustomerUsageReport = {
      generatedAt: new Date().toISOString(),
      summary: emptyUserUsageSummary(filter),
      rows: [],
      filter,
    };
    return NextResponse.json({ ok: true, report });
  }
}
