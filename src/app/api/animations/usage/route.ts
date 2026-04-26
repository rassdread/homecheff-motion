import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/auth/session";
import { getAnimationUsageStatus } from "@/server/animations/usage-limits";
import {
  canUseAdvancedAnimationControls,
  getAdvancedAnimationLimitsForUser,
  getAllowedPresetIdsForUser,
} from "@/server/auth/permissions";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.isActive === false) {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 }
    );
  }
  const usage = await getAnimationUsageStatus(user.id, user.role);
  const allowedPresets = getAllowedPresetIdsForUser(user);
  const advancedLimits = getAdvancedAnimationLimitsForUser(user);
  return NextResponse.json(
    {
      ...usage,
      allowedPresets,
      canUseAdvancedAnimationControls: canUseAdvancedAnimationControls(user),
      advancedLimits: {
        advancedControls: advancedLimits.advancedControls,
        maxDurationSeconds: advancedLimits.maxDurationSeconds,
        maxImages: advancedLimits.maxImages,
        maxTransitions: advancedLimits.maxTransitions,
        allowedResolutions: [...advancedLimits.allowedResolutions],
        allowedModels: [...advancedLimits.allowedModels],
      },
    },
    { status: 200 }
  );
}
