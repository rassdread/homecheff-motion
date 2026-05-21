#!/usr/bin/env npx tsx
import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.animationProject.findMany({
    where: {
      OR: [
        { projectType: "instant_premium" },
        { instantOutputDurationSeconds: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      _count: { select: { images: true, transitions: true } },
      exports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, outputVideoUrl: true },
      },
    },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
