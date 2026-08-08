import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { deleteLibraryAsset } from "@/server/studio-library/library-asset-service";

type Ctx = { params: Promise<{ assetId: string }> };

/** Safe delete: soft by default; hard + force query params for permanent. */
export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { assetId } = await context.params;
  const url = new URL(request.url);
  const hard = url.searchParams.get("hard") === "1";
  const force = url.searchParams.get("force") === "1";

  const result = await deleteLibraryAsset({
    assetId,
    ownerId: user.id,
    hard,
    force,
  });

  if (!result.ok) {
    if (result.code === "not_found") {
      return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      {
        error: "Asset has dependencies. Archive, restore, or force delete.",
        code: "has_dependencies",
        dependencies: result.dependencies,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, mode: result.mode, assetId: result.assetId });
}
