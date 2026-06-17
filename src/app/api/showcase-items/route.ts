import { NextResponse } from "next/server";
import {
  mapShowcasePageKeyToDbQuery,
  resolvePublicShowcaseExamples,
} from "@/lib/showcase-item-resolve";
import {
  listStudioShowcaseItemsByPageKey,
} from "@/server/studio/studio-showcase-item-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageKey = mapShowcasePageKeyToDbQuery(url.searchParams.get("pageKey") ?? "home");
  const locale = url.searchParams.get("locale");

  const [pageItems, globalItems] = await Promise.all([
    listStudioShowcaseItemsByPageKey(pageKey),
    pageKey === "global" ? Promise.resolve([]) : listStudioShowcaseItemsByPageKey("global"),
  ]);

  const resolved = resolvePublicShowcaseExamples({
    pageKey,
    pageItems,
    globalItems,
    locale,
  });

  return NextResponse.json(
    {
      ok: true,
      pageKey,
      source: resolved.source,
      items: resolved.examples,
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    }
  );
}
