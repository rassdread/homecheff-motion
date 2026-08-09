import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadGenerationJobFinancialBrowser } from "@/server/admin/studio-generation-job-financial-admin";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "75");
  const status = url.searchParams.get("status") ?? undefined;
  const report = await loadGenerationJobFinancialBrowser({
    limit: Number.isFinite(limit) ? limit : 75,
    status: status || undefined,
  });
  return NextResponse.json({ ok: true, report }, { status: 200 });
}
