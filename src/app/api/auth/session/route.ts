import { NextResponse } from "next/server";
import { apiServiceUnavailable } from "@/server/api-error-response";
import {
  canUseAdvancedAnimationControls,
  getAdvancedAnimationLimitsForUser,
  getAllowedPresetIdsForUser,
} from "@/server/auth/permissions";
import { getAuthenticatedUser } from "@/server/auth/session";

export async function GET() {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    return apiServiceUnavailable("auth/session", error);
  }

  if (!user) {
    return NextResponse.json(
      {
        user: null,
        allowedPresets: [] as string[],
        canUseAdvancedAnimationControls: false,
        advancedLimits: {
          advancedControls: false,
          maxDurationSeconds: 8,
          maxImages: 7,
          maxTransitions: 6,
          allowedResolutions: ["540p", "720p"] as const,
          allowedModels: ["viduq3-turbo"] as const,
        },
      },
      { status: 200 }
    );
  }

  const allowedPresets = getAllowedPresetIdsForUser(user);
  const advancedLimits = getAdvancedAnimationLimitsForUser(user);

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
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
