import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createStudioStoryboard,
  listStudioStoryboards,
} from "@/server/studio/studio-storyboard-service";
import type {
  StudioStoryboardDetailResponse,
  StudioStoryboardListResponse,
} from "@/types/studio-api";
import type { StudioStoryboardCreateInput } from "@/lib/studio-storyboard-validation";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const storyboards = await listStudioStoryboards(user);
  const body: StudioStoryboardListResponse = { storyboards };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: StudioStoryboardCreateInput;
  try {
    body = (await request.json()) as StudioStoryboardCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createStudioStoryboard(user.id, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioStoryboardDetailResponse = { storyboard: result.storyboard };
  return NextResponse.json(response, { status: 201 });
}
