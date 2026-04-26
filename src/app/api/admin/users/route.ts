import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/permissions";
import { getUsageCountsForUsers } from "@/server/animations/usage-limits";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const usageMap = await getUsageCountsForUsers(users.map((u) => u.id));
  const withUsage = users.map((u) => {
    const counts = usageMap.get(u.id) ?? { todayProjects: 0, monthProjects: 0 };
    return { ...u, usageToday: counts.todayProjects, usageMonth: counts.monthProjects };
  });

  return NextResponse.json({ users: withUsage }, { status: 200 });
}
