import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadStripeReadiness } from "@/server/admin/studio-stripe-readiness-service";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const readiness = await loadStripeReadiness();
  return NextResponse.json({ ok: true, readiness }, { status: 200 });
}
