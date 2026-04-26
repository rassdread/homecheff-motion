import { prisma } from "@/lib/prisma";
import type { AnimationPresetId } from "@/lib/animation-presets";

function normalizeRoleForLimits(role: string): "admin" | "power" | "user" {
  if (role === "admin" || role === "power") {
    return role;
  }
  return "user";
}

/** Large caps for admin — still tracked in ledger. */
const ADMIN_CAP = 999_999;

export type UsageLimitsConfig = {
  maxVideosPerDay: number;
  maxVideosPerMonth: number;
  maxEstimatedCreditsPerDay: number;
  maxEstimatedCreditsPerMonth: number;
  presetDailyMax: Record<AnimationPresetId, number>;
};

export function getUsageLimitsForRole(role: string): UsageLimitsConfig {
  const r = normalizeRoleForLimits(role);
  if (r === "admin") {
    return {
      maxVideosPerDay: ADMIN_CAP,
      maxVideosPerMonth: ADMIN_CAP,
      maxEstimatedCreditsPerDay: ADMIN_CAP,
      maxEstimatedCreditsPerMonth: ADMIN_CAP,
      presetDailyMax: {
        basic: ADMIN_CAP,
        standard: ADMIN_CAP,
        pro: ADMIN_CAP,
        smooth: ADMIN_CAP,
      },
    };
  }
  if (r === "power") {
    return {
      maxVideosPerDay: 20,
      maxVideosPerMonth: 150,
      maxEstimatedCreditsPerDay: 3000,
      maxEstimatedCreditsPerMonth: 20000,
      presetDailyMax: {
        basic: 20,
        standard: 15,
        pro: 8,
        smooth: 10,
      },
    };
  }
  return {
    maxVideosPerDay: 5,
    maxVideosPerMonth: 30,
    maxEstimatedCreditsPerDay: 500,
    maxEstimatedCreditsPerMonth: 3000,
    presetDailyMax: {
      basic: 10,
      standard: 5,
      pro: 0,
      smooth: 0,
    },
  };
}

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

export async function getAnimationUsageStatus(userId: string, role: string, now = new Date()) {
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const limits = getUsageLimitsForRole(role);

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

  const presetIds: AnimationPresetId[] = ["basic", "standard", "pro", "smooth"];
  const byPresetDaily = Object.fromEntries(
    presetIds.map((id) => [id, daily.filter((d) => d.presetId === id).length])
  ) as Record<AnimationPresetId, number>;

  return {
    dayStart: dayStart.toISOString(),
    monthStart: monthStart.toISOString(),
    limits,
    usage: {
      dailyVideosUsed,
      monthlyVideosUsed,
      dailyCreditsUsed,
      monthlyCreditsUsed,
      byPresetDaily,
    },
    remaining: {
      dailyVideosRemaining: Math.max(0, limits.maxVideosPerDay - dailyVideosUsed),
      monthlyVideosRemaining: Math.max(0, limits.maxVideosPerMonth - monthlyVideosUsed),
      dailyCreditsRemaining: Math.max(0, limits.maxEstimatedCreditsPerDay - dailyCreditsUsed),
      monthlyCreditsRemaining: Math.max(
        0,
        limits.maxEstimatedCreditsPerMonth - monthlyCreditsUsed
      ),
    },
  };
}

export async function assertUsageAllowed(params: {
  userId: string;
  userRole: string;
  presetId: AnimationPresetId;
  estimatedCredits: number;
}) {
  const status = await getAnimationUsageStatus(params.userId, params.userRole);
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
  const presetCap = limits.presetDailyMax[params.presetId];
  if (usage.byPresetDaily[params.presetId] >= presetCap) {
    return { ok: false as const, code: "ANIMATION_PRESET_DAILY_LIMIT" as const, status };
  }

  return { ok: true as const, status };
}

/** For admin UI — optional aggregates. */
export async function getUsageCountsForUser(
  userId: string,
  now = new Date()
): Promise<{ todayProjects: number; monthProjects: number }> {
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const [todayProjects, monthProjects] = await Promise.all([
    prisma.animationUsageLedger.count({
      where: { userId, createdAt: { gte: dayStart } },
    }),
    prisma.animationUsageLedger.count({
      where: { userId, createdAt: { gte: monthStart } },
    }),
  ]);
  return { todayProjects, monthProjects };
}
