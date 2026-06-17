import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { listStudioPricingCatalogAdmin } from "@/server/studio-account/studio-pricing-rule-service";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const paidFilter = url.searchParams.get("paid");
  const search = url.searchParams.get("search")?.trim().toLowerCase();

  let items = await listStudioPricingCatalogAdmin();

  if (category?.trim()) {
    items = items.filter((row) => row.category === category.trim());
  }

  if (paidFilter === "free") {
    items = items.filter((row) => row.isFree);
  } else if (paidFilter === "paid") {
    items = items.filter((row) => !row.isFree);
  }

  if (search) {
    items = items.filter(
      (row) =>
        row.actionType.toLowerCase().includes(search) ||
        row.displayNameNl.toLowerCase().includes(search) ||
        row.displayNameEn.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ ok: true, items }, { status: 200 });
}
