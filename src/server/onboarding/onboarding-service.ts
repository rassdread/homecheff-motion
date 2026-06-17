import { prisma } from "@/lib/prisma";

export type OnboardingStepId =
  | "create_account"
  | "complete_profile"
  | "create_first_project"
  | "generate_first_asset"
  | "complete_first_render";

export type OnboardingStep = {
  id: OnboardingStepId;
  completed: boolean;
  href?: string;
};

export type OnboardingProgress = {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  percentComplete: number;
  isComplete: boolean;
  firstRenderCompleted: boolean;
};

export async function loadOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  const [user, projectCount, assetCounts, completedRenderCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, createdAt: true },
    }),
    prisma.animationProject.count({ where: { ownerId: userId } }),
    Promise.all([
      prisma.studioCharacter.count({ where: { ownerId: userId } }),
      prisma.studioStoryboard.count({ where: { ownerId: userId } }),
      prisma.editorCanvasProject.count({ where: { ownerId: userId } }),
    ]),
    prisma.animationTransition.count({
      where: {
        status: "completed",
        project: { ownerId: userId },
        provider: { not: "mock" },
      },
    }),
  ]);

  const totalAssets = assetCounts[0] + assetCounts[1] + assetCounts[2];
  const hasProfile = Boolean(user?.email?.includes("@"));
  const firstRenderCompleted = completedRenderCount > 0;

  const steps: OnboardingStep[] = [
    { id: "create_account", completed: true },
    {
      id: "complete_profile",
      completed: hasProfile,
      href: "/account/settings",
    },
    {
      id: "create_first_project",
      completed: projectCount > 0,
      href: "/studio/storyboards/new",
    },
    {
      id: "generate_first_asset",
      completed: totalAssets > 0,
      href: "/studio/characters/new",
    },
    {
      id: "complete_first_render",
      completed: firstRenderCompleted,
      href: "/animate/instant",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    percentComplete: Math.round((completedCount / steps.length) * 100),
    isComplete: completedCount === steps.length,
    firstRenderCompleted,
  };
}
