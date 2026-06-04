import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  REFRESH_STUDIO_FORBIDDEN,
  REFRESH_STUDIO_NOT_FOUND,
  REFRESH_STUDIO_NO_SOURCE,
  REFRESH_STUDIO_STORYBOARD_GONE,
  checkStudioIntelligenceStalenessForProject,
} from "@/server/instant-premium/refresh-studio-intelligence";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function httpStatusForCode(code?: string): number {
  switch (code) {
    case REFRESH_STUDIO_NOT_FOUND:
      return 404;
    case REFRESH_STUDIO_FORBIDDEN:
      return 403;
    case REFRESH_STUDIO_NO_SOURCE:
      return 400;
    case REFRESH_STUDIO_STORYBOARD_GONE:
      return 404;
    default:
      return 400;
  }
}

/** Explicit stale check (not run on every page load). Optionally persists studioLastStaleReason. */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const persistHint = url.searchParams.get("persistHint") === "1";

  const result = await checkStudioIntelligenceStalenessForProject({
    projectId: id,
    userId: user.id,
    isAdmin: user.role === "admin",
    persistHint,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: httpStatusForCode(result.code) }
    );
  }

  return NextResponse.json({
    ok: true,
    staleness: result.staleness,
    studioQa: result.studioQa,
  });
}
