import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  addLibraryAssetVersion,
  listLibraryAssetVersions,
} from "@/server/studio-library/library-asset-service";
import { serializeLibraryAsset } from "@/server/studio-library/serialize";

type Ctx = { params: Promise<{ assetId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { assetId } = await context.params;
  const result = await listLibraryAssetVersions({ assetId, ownerId: user.id });
  if (!result) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    asset: serializeLibraryAsset(result.asset),
    versions: result.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      previewUrl: v.previewUrl || null,
      downloadUrl: v.downloadUrl || null,
      promptSummary: v.promptSummary || null,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { assetId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const result = await addLibraryAssetVersion({
    assetId,
    ownerId: user.id,
    label: typeof body.label === "string" ? body.label : undefined,
    previewUrl: typeof body.previewUrl === "string" ? body.previewUrl : undefined,
    downloadUrl: typeof body.downloadUrl === "string" ? body.downloadUrl : undefined,
    storageKey: typeof body.storageKey === "string" ? body.storageKey : undefined,
    promptSummary: typeof body.promptSummary === "string" ? body.promptSummary : undefined,
    promoteToHead: body.promoteToHead !== false,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      asset: serializeLibraryAsset(result.asset),
      versionNumber: result.versionNumber,
    },
    { status: 201 }
  );
}
