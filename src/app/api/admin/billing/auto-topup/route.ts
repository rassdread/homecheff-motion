import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadAutoTopUpAdminSummary } from "@/server/admin/studio-auto-topup-admin";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "100");
  const summary = await loadAutoTopUpAdminSummary(Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ ok: true, summary }, { status: 200 });
}
