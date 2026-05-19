import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { getViduCreditBalance } from "@/server/video-providers/vidu-credits";

export const dynamic = "force-dynamic";

/** Admin-only Vidu credit balance (no API keys in response). */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const balance = await getViduCreditBalance({ bypassCache: refresh });

  return NextResponse.json(balance, { status: balance.ok ? 200 : 502 });
}
