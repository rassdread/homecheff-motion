import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadWalletProviderReconciliation } from "@/server/admin/studio-wallet-provider-reconciliation";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const report = await loadWalletProviderReconciliation();
  return NextResponse.json({ ok: true, report }, { status: 200 });
}
