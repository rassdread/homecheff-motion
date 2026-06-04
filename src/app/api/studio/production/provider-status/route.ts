import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildProductionProviderReport } from "@/lib/studio-production-providers";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const report = buildProductionProviderReport();
  return NextResponse.json({ ok: true, ...report });
}
