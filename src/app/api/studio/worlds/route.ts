import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createStudioWorldProfile,
  listStudioWorldProfiles,
} from "@/server/studio/studio-world-profile-service";
import type {
  StudioWorldProfileDetailResponse,
  StudioWorldProfileListResponse,
} from "@/types/studio-api";
import type { StudioWorldProfileCreateInput } from "@/lib/studio-world-profile-validation";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const worlds = await listStudioWorldProfiles(user);
  const body: StudioWorldProfileListResponse = { worlds };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: StudioWorldProfileCreateInput;
  try {
    body = (await request.json()) as StudioWorldProfileCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createStudioWorldProfile(user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioWorldProfileDetailResponse = { world: result.world };
  return NextResponse.json(response, { status: 201 });
}
