import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadBillingAnalytics } from "@/server/admin/studio-billing-analytics-service";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const analytics = await loadBillingAnalytics();
  return NextResponse.json({ ok: true, analytics }, { status: 200 });
}
