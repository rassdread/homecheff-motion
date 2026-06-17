import { NextResponse } from "next/server";
import { listPublicPricingCatalog } from "@/server/studio-account/studio-pricing-rule-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? undefined;
  const category = url.searchParams.get("category");

  let items = await listPublicPricingCatalog(locale);

  if (category?.trim()) {
    items = items.filter((row) => row.category === category.trim());
  }

  return NextResponse.json(
    { ok: true, items },
    {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
    }
  );
}
