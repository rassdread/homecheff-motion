import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listStudioProjectsForUser } from "@/server/studio/studio-project-library";
import type { StudioProjectLibraryResponse } from "@/types/studio-project-summary";

/**
 * S2H — Human project library aggregation.
 * GET /api/studio/projects?limit=&cursor=&archived=
 */
export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 40;
  const cursor = url.searchParams.get("cursor");
  const archived = url.searchParams.get("archived") === "1";

  const body: StudioProjectLibraryResponse = await listStudioProjectsForUser({
    ownerId: user.id,
    limit,
    cursor,
    archived,
  });

  return NextResponse.json(body, { status: 200 });
}
