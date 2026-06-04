import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  applyStudioMotionSyncToProject,
  SYNC_STUDIO_ADD_SCENES_CONFIRM,
  SYNC_STUDIO_NOTHING_SELECTED,
  SYNC_STUDIO_REMOVE_SCENES_CONFIRM,
  SYNC_STUDIO_RENDERING,
} from "@/server/instant-premium/apply-studio-motion-sync";
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
    case SYNC_STUDIO_RENDERING:
      return 409;
    case SYNC_STUDIO_NOTHING_SELECTED:
    case SYNC_STUDIO_REMOVE_SCENES_CONFIRM:
    case SYNC_STUDIO_ADD_SCENES_CONFIRM:
      return 400;
    default:
      return 400;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    syncImages?: boolean;
    syncTexts?: boolean;
    syncEmotions?: boolean;
    syncDurations?: boolean;
    syncContext?: boolean;
    confirmRemoveScenes?: boolean;
    confirmAddScenes?: boolean;
  } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const result = await applyStudioMotionSyncToProject({
    projectId: id,
    userId: user.id,
    isAdmin: user.role === "admin",
    input: body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: httpStatusForCode(result.code) }
    );
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    preview: result.preview,
    audit: result.audit,
    studioQa: result.studioQa,
  });
}
