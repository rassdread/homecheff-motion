import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  bulkCreatePromoCodes,
  createStudioPromoCode,
  listStudioPromoCodes,
  updateStudioPromoCode,
} from "@/server/studio-account/studio-promo-code-service";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const promotionId = new URL(request.url).searchParams.get("promotionId") ?? undefined;
  const codes = await listStudioPromoCodes(promotionId);
  return NextResponse.json({ ok: true, codes }, { status: 200 });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const body = (await request.json()) as {
    action?: string;
    code?: string;
    promotionId?: string;
    maxUses?: number | null;
    notes?: string;
    prefix?: string;
    count?: number;
  };

  if (body.action === "bulk" && body.promotionId && body.prefix && body.count) {
    const codes = await bulkCreatePromoCodes({
      promotionId: body.promotionId,
      prefix: body.prefix,
      count: body.count,
      maxUses: body.maxUses ?? 1,
    });
    return NextResponse.json({ ok: true, codes }, { status: 201 });
  }

  if (!body.code || !body.promotionId) {
    return NextResponse.json({ error: "code and promotionId required" }, { status: 400 });
  }

  const row = await createStudioPromoCode({
    code: body.code,
    promotionId: body.promotionId,
    maxUses: body.maxUses,
    notes: body.notes,
  });
  return NextResponse.json({ ok: true, code: row }, { status: 201 });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const body = (await request.json()) as { id?: string; active?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const row = await updateStudioPromoCode(body.id, { active: body.active });
  return NextResponse.json({ ok: true, code: row }, { status: 200 });
}
