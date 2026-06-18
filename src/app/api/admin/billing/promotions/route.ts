import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  createPromotionWithCode,
  listStudioPromotions,
  updateStudioPromotion,
} from "@/server/studio-account/studio-promotion-service";
import type { PromotionFormInput } from "@/lib/studio-promotion-validation";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const promotions = await listStudioPromotions();
  return NextResponse.json({ ok: true, promotions }, { status: 200 });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const body = (await request.json()) as PromotionFormInput;

  if (!body.name || !body.slug || !body.code) {
    return NextResponse.json({ error: "Missing promotion fields." }, { status: 400 });
  }

  const result = await createPromotionWithCode(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  const promotions = await listStudioPromotions();
  const promotion = promotions.find((p) => p.id === result.promotionId);
  return NextResponse.json({ ok: true, promotion, promotionId: result.promotionId }, { status: 201 });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const body = (await request.json()) as { id?: string; active?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const promotion = await updateStudioPromotion(body.id, { active: body.active });
  return NextResponse.json({ ok: true, promotion }, { status: 200 });
}
