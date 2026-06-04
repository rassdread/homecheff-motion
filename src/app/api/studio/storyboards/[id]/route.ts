import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteStudioStoryboard,
  getStudioStoryboardById,
  updateStudioStoryboard,
} from "@/server/studio/studio-storyboard-service";
import type { StudioStoryboardDetailResponse } from "@/types/studio-api";
import type { StudioStoryboardUpdateInput } from "@/lib/studio-storyboard-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const body: StudioStoryboardDetailResponse = { storyboard };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: StudioStoryboardUpdateInput;
  try {
    body = (await request.json()) as StudioStoryboardUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateStudioStoryboard(id, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioStoryboardDetailResponse = { storyboard: result.storyboard };
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await deleteStudioStoryboard(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
