import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteStudioLocation,
  getStudioLocationById,
  updateStudioLocation,
} from "@/server/studio/studio-location-service";
import type { StudioLocationDetailResponse } from "@/types/studio-api";
import type { StudioLocationUpdateInput } from "@/lib/studio-location-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const location = await getStudioLocationById(id, user);
  if (!location) {
    return NextResponse.json({ error: "Location not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const body: StudioLocationDetailResponse = { location };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  let body: StudioLocationUpdateInput;
  try {
    body = (await request.json()) as StudioLocationUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateStudioLocation(id, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioLocationDetailResponse = { location: result.location };
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await deleteStudioLocation(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
