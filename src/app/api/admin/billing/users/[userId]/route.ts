import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  adminGrantUserCredits,
  adminRemoveUserCredits,
  loadUserBillingDetail,
} from "@/server/admin/studio-billing-admin-service";
import type { CreditOriginType } from "@/types/studio-billing";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const { userId } = await context.params;
  const billing = await loadUserBillingDetail(userId);
  if (!billing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, billing }, { status: 200 });
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    return admin;
  }
  const { userId } = await context.params;
  const body = (await request.json()) as {
    action?: string;
    credits?: number;
    reason?: string;
    creditOrigin?: CreditOriginType;
  };

  if (!body.credits || !body.reason?.trim()) {
    return NextResponse.json({ error: "credits and reason required" }, { status: 400 });
  }

  if (body.action === "remove") {
    const result = await adminRemoveUserCredits({
      userId,
      credits: body.credits,
      adminUserId: admin.id,
      reason: body.reason.trim(),
    });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  }

  const result = await adminGrantUserCredits({
    userId,
    credits: body.credits,
    adminUserId: admin.id,
    reason: body.reason.trim(),
    creditOrigin: body.creditOrigin,
  });
  return NextResponse.json({ ok: true, result }, { status: 200 });
}
