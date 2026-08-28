import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listPublicFreeMusicCatalog } from "@/lib/free-music/registry";
import { isStudioFreeMusicCatalogEnabledForUser } from "@/lib/free-music/flag";

export const dynamic = "force-dynamic";

/**
 * Public-to-authenticated Free Music catalog read model.
 * Returns [] while STUDIO_FREE_MUSIC_CATALOG_ENABLED is off.
 * Never exposes storage keys, evidence, or review notes.
 */
export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  if (!isStudioFreeMusicCatalogEnabledForUser(user.id)) {
    return NextResponse.json({ enabled: false, tracks: [] as const });
  }

  const tracks = listPublicFreeMusicCatalog(user.id);
  return NextResponse.json({
    enabled: true,
    tracks,
  });
}
