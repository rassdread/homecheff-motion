import { NextResponse } from "next/server";
import { getAnimationUsageStatus } from "@/server/animations/usage-limits";
import {
  canUseAdvancedAnimationControls,
  getAdvancedAnimationLimitsForUser,
  getAllowedPresetIdsForUser,
} from "@/server/auth/permissions";
import { getAuthenticatedUser } from "@/server/auth/session";
import { apiServiceUnavailable } from "@/server/api-error-response";

export async function GET() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    return apiServiceUnavailable("animations/usage:session", error);
  }

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.isActive === false) {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 }
    );
  }

  let usage;
  try {
    usage = await getAnimationUsageStatus(user.id, user.role);
  } catch (error) {
    return apiServiceUnavailable("animations/usage", error);
  }

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
