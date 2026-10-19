import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { loadStudioProjectWorkspace } from "@/server/studio/load-studio-project-workspace";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const workspace = await loadStudioProjectWorkspace(user.id, projectId);
  if (!workspace) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ workspace }, { headers: { "Cache-Control": "private, no-store" } });
}
