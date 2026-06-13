import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { previewStudioCreditAuthorization } from "@/server/studio-account/studio-credit-authorization";
import { STUDIO_ACTION_TYPES } from "@/server/studio-account/studio-action-cost-registry";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { actionType?: string; projectId?: string };
  try {
    body = (await request.json()) as { actionType?: string; projectId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const actionType = body.actionType?.trim();
  if (!actionType || !STUDIO_ACTION_TYPES.includes(actionType as (typeof STUDIO_ACTION_TYPES)[number])) {
    return NextResponse.json({ error: "Unknown action type.", code: "UNKNOWN_ACTION" }, { status: 400 });
  }

  const preview = await previewStudioCreditAuthorization({
    user,
    actionType,
    projectId: body.projectId,
  });

  return NextResponse.json({ ok: true, preview }, { status: 200 });
}
