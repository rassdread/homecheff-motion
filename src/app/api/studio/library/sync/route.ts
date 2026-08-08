import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { loadUserStudioAssetRegistry } from "@/server/studio/load-user-studio-asset-registry";
import { syncStudioAssetsIntoLibrary } from "@/server/studio-library/sync-registry-to-library";

/** Index existing virtual registry into canonical library (idempotent upsert). */
export async function POST() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const snapshot = await loadUserStudioAssetRegistry(user);
  const result = await syncStudioAssetsIntoLibrary({
    ownerId: user.id,
    assets: snapshot.registry,
    limit: 200,
  });

  return NextResponse.json({
    ok: true,
    registryCount: snapshot.registry.length,
    upserted: result.upserted,
    errors: result.errors,
  });
}
