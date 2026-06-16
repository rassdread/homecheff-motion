import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadAdminBillingOverview } from "@/server/admin/studio-billing-admin-service";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const overview = await loadAdminBillingOverview();
  return NextResponse.json({ ok: true, overview }, { status: 200 });
}
