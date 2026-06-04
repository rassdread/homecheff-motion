import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  REFRESH_STUDIO_FORBIDDEN,
  REFRESH_STUDIO_NOT_FOUND,
  REFRESH_STUDIO_NOT_IMPLEMENTED,
  REFRESH_STUDIO_NO_SOURCE,
  REFRESH_STUDIO_PAYLOAD_TOO_LARGE,
  REFRESH_STUDIO_STORYBOARD_GONE,
  refreshStudioIntelligenceForAnimationProject,
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
    case REFRESH_STUDIO_NOT_IMPLEMENTED:
      return 501;
    case REFRESH_STUDIO_PAYLOAD_TOO_LARGE:
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
    refreshQa?: boolean;
    refreshImages?: boolean;
    refreshText?: boolean;
  } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    body = {};
  }

  const result = await refreshStudioIntelligenceForAnimationProject({
    projectId: id,
    userId: user.id,
    isAdmin: user.role === "admin",
    options: {
      refreshQa: body.refreshQa,
      refreshImages: body.refreshImages,
      refreshText: body.refreshText,
    },
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
    studioQa: result.studioQa,
    audit: result.audit,
    stalenessBefore: result.stalenessBefore,
  });
}
