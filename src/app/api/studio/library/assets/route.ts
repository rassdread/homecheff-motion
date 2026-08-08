import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  listLibraryAssetsForOwner,
  upsertLibraryAsset,
} from "@/server/studio-library/library-asset-service";
import { serializeLibraryAsset } from "@/server/studio-library/serialize";
import {
  isStudioLibraryAssetFamily,
  type StudioLibraryAssetFamily,
  type StudioLibraryOrigin,
} from "@/lib/studio-library-types";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const familyRaw = url.searchParams.get("family");
  const family =
    familyRaw && isStudioLibraryAssetFamily(familyRaw) ? familyRaw : null;
  const projectId = url.searchParams.get("projectId");
  const query = url.searchParams.get("q") ?? "";
  const favoriteOnly = url.searchParams.get("favorite") === "1";
  const status = (url.searchParams.get("status") ?? "active") as "active" | "all" | "archived";
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number(url.searchParams.get("limit") ?? "40");

  const page = await listLibraryAssetsForOwner({
    ownerId: user.id,
    family,
    projectId,
    query,
    favoriteOnly,
    status,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 40,
  });

  return NextResponse.json({
    assets: page.items.map(serializeLibraryAsset),
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
  });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const family = typeof body.family === "string" ? body.family : "";
  if (!isStudioLibraryAssetFamily(family)) {
    return NextResponse.json({ error: "Invalid family.", code: "validation" }, { status: 400 });
  }
  const sourceKind = typeof body.sourceKind === "string" ? body.sourceKind : "manual";
  const sourceId =
    typeof body.sourceId === "string" && body.sourceId.trim()
      ? body.sourceId
      : `manual_${Date.now()}`;
  const title = typeof body.title === "string" ? body.title : "Untitled";

  try {
    const row = await upsertLibraryAsset({
      ownerId: user.id,
      family: family as StudioLibraryAssetFamily,
      category: typeof body.category === "string" ? body.category : "",
      title,
      description: typeof body.description === "string" ? body.description : "",
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [],
      origin: (typeof body.origin === "string" ? body.origin : "uploaded") as StudioLibraryOrigin,
      previewUrl: typeof body.previewUrl === "string" ? body.previewUrl : "",
      downloadUrl: typeof body.downloadUrl === "string" ? body.downloadUrl : "",
      storageKey: typeof body.storageKey === "string" ? body.storageKey : "",
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "",
      backingStore: typeof body.backingStore === "string" ? body.backingStore : "blob_manifest",
      sourceKind,
      sourceId,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      promptSummary: typeof body.promptSummary === "string" ? body.promptSummary : "",
      language: typeof body.language === "string" ? body.language : "",
      aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "",
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : null,
      width: typeof body.width === "number" ? body.width : null,
      height: typeof body.height === "number" ? body.height : null,
    });
    return NextResponse.json({ asset: serializeLibraryAsset(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create asset.", code: "validation" },
      { status: 400 }
    );
  }
}
