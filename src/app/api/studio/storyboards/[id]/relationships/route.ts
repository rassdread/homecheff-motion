import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { getStoryboardRelationships } from "@/server/studio/studio-asset-story-usage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Storyboard not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const relationships = await getStoryboardRelationships(id);
  if (!relationships) {
    return NextResponse.json({ error: "Storyboard not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, relationships });
}
