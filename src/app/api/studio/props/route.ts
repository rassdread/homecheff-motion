import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createStudioProp, listStudioProps } from "@/server/studio/studio-prop-service";
import type { StudioPropDetailResponse, StudioPropListResponse } from "@/types/studio-api";
import type { StudioPropCreateInput } from "@/lib/studio-prop-validation";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const props = await listStudioProps(user);
  const body: StudioPropListResponse = { props };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: StudioPropCreateInput;
  try {
    body = (await request.json()) as StudioPropCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createStudioProp(user.id, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioPropDetailResponse = { prop: result.prop };
  return NextResponse.json(response, { status: 201 });
}
