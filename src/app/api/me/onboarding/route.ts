import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadOnboardingProgress } from "@/server/onboarding/onboarding-service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const progress = await loadOnboardingProgress(user.id);
  return NextResponse.json({ progress });
}
