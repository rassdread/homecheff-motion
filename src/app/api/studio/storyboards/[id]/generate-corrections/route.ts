import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { generateStoryboardCorrections } from "@/server/studio/studio-correction-service";
import type { StoryboardGenerateCorrectionsResponse } from "@/types/studio-correction";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const result = await generateStoryboardCorrections(storyboardId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StoryboardGenerateCorrectionsResponse = { summary: result.summary };
  return NextResponse.json(body, { status: 200 });
}
