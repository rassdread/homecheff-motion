import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  buildUserStudioDashboard,
  buildUserStudioHomeShell,
  buildUserStudioInsights,
} from "@/server/studio/user-studio-insights";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view")?.trim();
  const report =
    view === "shell" ? await buildUserStudioHomeShell(user.id)
    : view === "dashboard" ? await buildUserStudioDashboard(user.id)
    : await buildUserStudioInsights(user.id);
  return NextResponse.json({ ok: true, report });
}
