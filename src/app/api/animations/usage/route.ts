import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";
import { getAnimationUsageStatus } from "@/server/animations/usage-limits";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const usage = await getAnimationUsageStatus(user.id);
  return NextResponse.json(usage, { status: 200 });
}

