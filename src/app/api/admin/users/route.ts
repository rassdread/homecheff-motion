import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/permissions";
import { getUsageCountsForUser } from "@/server/animations/usage-limits";

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

  const withUsage = await Promise.all(
    users.map(async (u) => {
      const counts = await getUsageCountsForUser(u.id);
      return { ...u, usageToday: counts.todayProjects, usageMonth: counts.monthProjects };
    })
  );

  return NextResponse.json({ users: withUsage }, { status: 200 });
}
