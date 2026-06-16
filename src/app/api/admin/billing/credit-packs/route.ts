import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  listStudioCreditPacks,
  upsertStudioCreditPack,
} from "@/server/studio-account/studio-credit-pack-service";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const packs = await listStudioCreditPacks();
  return NextResponse.json({ ok: true, packs }, { status: 200 });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.slug || !body.name || typeof body.credits !== "number" || typeof body.priceEur !== "number") {
    return NextResponse.json({ error: "slug, name, credits, priceEur required" }, { status: 400 });
  }
  const pack = await upsertStudioCreditPack({
    slug: String(body.slug),
    name: String(body.name),
    credits: body.credits,
    priceEur: body.priceEur,
    bonusCredits: typeof body.bonusCredits === "number" ? body.bonusCredits : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    stripePriceId: body.stripePriceId != null ? String(body.stripePriceId) : undefined,
  });
  return NextResponse.json({ ok: true, pack }, { status: 200 });
}
