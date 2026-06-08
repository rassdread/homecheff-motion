import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildUserStudioInsights } from "@/server/studio/user-studio-insights";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const report = await buildUserStudioInsights(user.id);
  return NextResponse.json({ ok: true, report });
}
