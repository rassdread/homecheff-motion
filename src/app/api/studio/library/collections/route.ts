import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  addAssetToCollection,
  createAssetCollection,
  listAssetCollectionsForOwner,
  removeAssetFromCollection,
} from "@/server/studio-library/library-collections-service";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const rows = await listAssetCollectionsForOwner(user.id);
  return NextResponse.json({
    collections: rows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      labelKey: c.labelKey,
      projectId: c.projectId,
      assetIds: c.members.map((m) => m.assetId),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
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

  // Member ops
  if (body.op === "add_member" || body.op === "remove_member") {
    const collectionId = typeof body.collectionId === "string" ? body.collectionId : "";
    const assetId = typeof body.assetId === "string" ? body.assetId : "";
    if (!collectionId || !assetId) {
      return NextResponse.json(
        { error: "collectionId and assetId required.", code: "validation" },
        { status: 400 }
      );
    }
    if (body.op === "add_member") {
      const result = await addAssetToCollection({
        ownerId: user.id,
        collectionId,
        assetId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    const removed = await removeAssetFromCollection({
      ownerId: user.id,
      collectionId,
      assetId,
    });
    if (!removed) {
      return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name : "";
  try {
    const row = await createAssetCollection({
      ownerId: user.id,
      name,
      description: typeof body.description === "string" ? body.description : "",
      labelKey: typeof body.labelKey === "string" ? body.labelKey : "",
      projectId: typeof body.projectId === "string" ? body.projectId : null,
    });
    return NextResponse.json(
      {
        collection: {
          id: row.id,
          name: row.name,
          description: row.description,
          labelKey: row.labelKey,
          projectId: row.projectId,
          assetIds: [] as string[],
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed.", code: "validation" },
      { status: 400 }
    );
  }
}
