import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteStudioProp,
  getStudioPropById,
  updateStudioProp,
} from "@/server/studio/studio-prop-service";
import type { StudioPropDetailResponse } from "@/types/studio-api";
import type { StudioPropUpdateInput } from "@/lib/studio-prop-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const prop = await getStudioPropById(id, user);
  if (!prop) {
    return NextResponse.json({ error: "Prop not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const body: StudioPropDetailResponse = { prop };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: StudioPropUpdateInput;
  try {
    body = (await request.json()) as StudioPropUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateStudioProp(id, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioPropDetailResponse = { prop: result.prop };
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await deleteStudioProp(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
