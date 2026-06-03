import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createStudioLocation,
  listStudioLocations,
} from "@/server/studio/studio-location-service";
import type {
  StudioLocationDetailResponse,
  StudioLocationListResponse,
} from "@/types/studio-api";
import type { StudioLocationCreateInput } from "@/lib/studio-location-validation";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const locations = await listStudioLocations(user);
  const body: StudioLocationListResponse = { locations };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: StudioLocationCreateInput;
  try {
    body = (await request.json()) as StudioLocationCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createStudioLocation(user.id, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioLocationDetailResponse = { location: result.location };
  return NextResponse.json(response, { status: 201 });
}
