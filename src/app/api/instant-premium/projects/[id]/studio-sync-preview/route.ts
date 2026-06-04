import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildStudioMotionSyncPreviewForProject } from "@/server/instant-premium/apply-studio-motion-sync";
import {
  REFRESH_STUDIO_FORBIDDEN,
  REFRESH_STUDIO_NOT_FOUND,
  REFRESH_STUDIO_NO_SOURCE,
  REFRESH_STUDIO_STORYBOARD_GONE,
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

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const result = await buildStudioMotionSyncPreviewForProject({
    projectId: id,
    userId: user.id,
    isAdmin: user.role === "admin",
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: httpStatusForCode(result.code) }
    );
  }

  return NextResponse.json({ ok: true, preview: result.preview });
}
