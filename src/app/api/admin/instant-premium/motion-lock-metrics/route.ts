import { NextResponse } from "next/server";
import { loadMotionLockAggregateMetrics } from "@/lib/motion-lock-metrics";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const metrics = await loadMotionLockAggregateMetrics();

  return NextResponse.json(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      metrics,
    },
    { status: 200 }
  );
}
