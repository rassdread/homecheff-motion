import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  adminGrantUserCredits,
  adminRemoveUserCredits,
  patchStudioBillingPolicy,
  searchBillingUsers,
} from "@/server/admin/studio-billing-admin-service";
import type { CarryMode, CreditOriginType } from "@/types/studio-billing";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchBillingUsers(q);
  return NextResponse.json({ ok: true, users }, { status: 200 });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const body = (await request.json()) as {
    carryMode?: CarryMode;
    newUserGrantCredits?: number;
    defaultConfirmAboveCredits?: number;
  };

  const policy = await patchStudioBillingPolicy(body);
  return NextResponse.json({ ok: true, policy }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    return admin;
  }

  const body = (await request.json()) as {
    action?: string;
    userId?: string;
    credits?: number;
    reason?: string;
    creditOrigin?: CreditOriginType;
  };

  if (!body.userId || !body.credits || !body.reason) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  if (body.action === "remove") {
    const result = await adminRemoveUserCredits({
      userId: body.userId,
      credits: body.credits,
      adminUserId: admin.id,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  }

  const result = await adminGrantUserCredits({
    userId: body.userId,
    credits: body.credits,
    adminUserId: admin.id,
    reason: body.reason,
    creditOrigin: body.creditOrigin,
  });
  return NextResponse.json({ ok: true, result }, { status: 200 });
}
