import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadStudioFinanceSummary } from "@/server/admin/studio-finance-analytics";

export async function GET() {
  const user = await requireAdmin();
  if (user instanceof NextResponse) {
    return user;
  }

  const summary = await loadStudioFinanceSummary();
  return NextResponse.json({ ok: true, summary }, { status: 200 });
}
