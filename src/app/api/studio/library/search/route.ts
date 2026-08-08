import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listLibraryAssetsForOwner } from "@/server/studio-library/library-asset-service";
import { serializeLibraryAsset } from "@/server/studio-library/serialize";
import { isStudioLibraryAssetFamily } from "@/lib/studio-library-types";

/** Cross-library smart search (name / tags / metadata). */
export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const familyRaw = url.searchParams.get("family");
  const family = familyRaw && isStudioLibraryAssetFamily(familyRaw) ? familyRaw : null;
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number(url.searchParams.get("limit") ?? "40");

  const page = await listLibraryAssetsForOwner({
    ownerId: user.id,
    family,
    query: q,
    status: "active",
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 40,
  });

  return NextResponse.json({
    query: q,
    assets: page.items.map(serializeLibraryAsset),
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
  });
}
