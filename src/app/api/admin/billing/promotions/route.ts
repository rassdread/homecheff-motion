import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  createStudioPromotion,
  listStudioPromotions,
  updateStudioPromotion,
} from "@/server/studio-account/studio-promotion-service";

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

  const body = (await request.json()) as {
    name?: string;
    slug?: string;
    benefitType?: string;
    creditAmount?: number;
    maximumUsers?: number;
    maxRedemptions?: number;
    grantType?: string;
    startDate?: string | null;
    endDate?: string | null;
  };

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: "Missing promotion fields." }, { status: 400 });
  }

  const promotion = await createStudioPromotion({
    name: body.name,
    slug: body.slug,
    benefitType: body.benefitType as never,
    creditAmount: body.creditAmount ?? 0,
    maximumUsers: body.maximumUsers ?? body.maxRedemptions ?? 0,
    maxRedemptions: body.maxRedemptions ?? body.maximumUsers ?? null,
    grantType: body.grantType as never,
    startDate: body.startDate,
    endDate: body.endDate,
  });

  return NextResponse.json({ ok: true, promotion }, { status: 201 });
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
