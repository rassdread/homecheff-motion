import { prisma } from "@/lib/prisma";
import type { AnimationPresetId } from "@/lib/animation-presets";

export const ANIMATION_USAGE_LIMITS = {
  maxVideosPerDay: 5,
  maxEstimatedCreditsPerDay: 500,
  maxVideosPerMonth: 30,
  maxEstimatedCreditsPerMonth: 3000,
  presetDailyMax: {
    basic: 10,
    standard: 5,
    pro: 2,
  } as Record<AnimationPresetId, number>,
} as const;

export type UsageLimitCode =
  | "ANIMATION_DAILY_LIMIT"
  | "ANIMATION_MONTHLY_LIMIT"
  | "ANIMATION_CREDIT_LIMIT"
  | "ANIMATION_PRESET_DAILY_LIMIT";

function startOfDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getAnimationUsageStatus(userId: string, now = new Date()) {
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [daily, monthly] = await Promise.all([
    prisma.animationUsageLedger.findMany({
      where: { userId, createdAt: { gte: dayStart } },
      select: { presetId: true, estimatedCredits: true },
    }),
    prisma.animationUsageLedger.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      select: { estimatedCredits: true },
    }),
  ]);

  const dailyVideosUsed = daily.length;
  const monthlyVideosUsed = monthly.length;
  const dailyCreditsUsed = daily.reduce((sum, i) => sum + i.estimatedCredits, 0);
  const monthlyCreditsUsed = monthly.reduce((sum, i) => sum + i.estimatedCredits, 0);

  const byPresetDaily = {
    basic: daily.filter((d) => d.presetId === "basic").length,
    standard: daily.filter((d) => d.presetId === "standard").length,
    pro: daily.filter((d) => d.presetId === "pro").length,
  } as const;

  return {
    dayStart: dayStart.toISOString(),
    monthStart: monthStart.toISOString(),
    limits: ANIMATION_USAGE_LIMITS,
    usage: {
      dailyVideosUsed,
      monthlyVideosUsed,
      dailyCreditsUsed,
      monthlyCreditsUsed,
      byPresetDaily,
    },
    remaining: {
      dailyVideosRemaining: Math.max(0, ANIMATION_USAGE_LIMITS.maxVideosPerDay - dailyVideosUsed),
      monthlyVideosRemaining: Math.max(
        0,
        ANIMATION_USAGE_LIMITS.maxVideosPerMonth - monthlyVideosUsed
      ),
      dailyCreditsRemaining: Math.max(
        0,
        ANIMATION_USAGE_LIMITS.maxEstimatedCreditsPerDay - dailyCreditsUsed
      ),
      monthlyCreditsRemaining: Math.max(
        0,
        ANIMATION_USAGE_LIMITS.maxEstimatedCreditsPerMonth - monthlyCreditsUsed
      ),
    },
  };
}

export async function assertUsageAllowed(params: {
  userId: string;
  presetId: AnimationPresetId;
  estimatedCredits: number;
}) {
  const status = await getAnimationUsageStatus(params.userId);
  const { usage, limits } = status;

  if (usage.dailyVideosUsed >= limits.maxVideosPerDay) {
    return { ok: false as const, code: "ANIMATION_DAILY_LIMIT" as const, status };
  }
  if (usage.monthlyVideosUsed >= limits.maxVideosPerMonth) {
    return { ok: false as const, code: "ANIMATION_MONTHLY_LIMIT" as const, status };
  }
  if (usage.dailyCreditsUsed + params.estimatedCredits > limits.maxEstimatedCreditsPerDay) {
    return { ok: false as const, code: "ANIMATION_CREDIT_LIMIT" as const, status };
  }
  if (usage.monthlyCreditsUsed + params.estimatedCredits > limits.maxEstimatedCreditsPerMonth) {
    return { ok: false as const, code: "ANIMATION_CREDIT_LIMIT" as const, status };
  }
  if (usage.byPresetDaily[params.presetId] >= limits.presetDailyMax[params.presetId]) {
    return { ok: false as const, code: "ANIMATION_PRESET_DAILY_LIMIT" as const, status };
  }

  return { ok: true as const, status };
}

