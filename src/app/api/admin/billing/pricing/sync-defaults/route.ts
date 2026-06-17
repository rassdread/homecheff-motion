import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { syncStudioPricingDefaults } from "@/server/studio-account/studio-pricing-rule-service";

export async function POST() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const synced = await syncStudioPricingDefaults(gate.id);
  return NextResponse.json({ ok: true, synced }, { status: 200 });
}
