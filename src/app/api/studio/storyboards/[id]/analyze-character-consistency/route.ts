import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildCharacterConsistencyReportForStoryboard } from "@/server/studio/studio-character-consistency-service";
import type { StudioStoryboardCharacterConsistencyResponse } from "@/types/studio-character-consistency";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await buildCharacterConsistencyReportForStoryboard(id, user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body: StudioStoryboardCharacterConsistencyResponse = { report: result.report };
  return NextResponse.json(body, { status: 200 });
}
