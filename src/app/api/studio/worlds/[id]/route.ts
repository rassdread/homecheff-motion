import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteStudioWorldProfile,
  getStudioWorldProfileByIdForViewer,
  updateStudioWorldProfile,
} from "@/server/studio/studio-world-profile-service";
import type { StudioWorldProfileDetailResponse } from "@/types/studio-api";
import type { StudioWorldProfileUpdateInput } from "@/lib/studio-world-profile-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const world = await getStudioWorldProfileByIdForViewer(id, user);
  if (!world) {
    return NextResponse.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const body: StudioWorldProfileDetailResponse = { world };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: StudioWorldProfileUpdateInput;
  try {
    body = (await request.json()) as StudioWorldProfileUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateStudioWorldProfile(id, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioWorldProfileDetailResponse = { world: result.world };
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await deleteStudioWorldProfile(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
