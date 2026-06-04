import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { bulkImproveScenesWithApproval } from "@/server/studio/studio-improvement-service";
import type { BulkImproveScenesResponse } from "@/types/studio-improvement";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const body = (await request.json()) as { sceneIds?: string[]; autoSelect?: boolean };
  const sceneIds = Array.isArray(body.sceneIds) ? body.sceneIds.filter(Boolean) : [];

  if (sceneIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one scene.", code: "NO_SCENES" },
      { status: 400 }
    );
  }

  const result = await bulkImproveScenesWithApproval(storyboardId, sceneIds, user, {
    autoSelect: body.autoSelect,
  });
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: BulkImproveScenesResponse = result;
  return NextResponse.json(response, { status: 200 });
}
