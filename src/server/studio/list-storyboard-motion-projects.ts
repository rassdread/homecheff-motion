import { prisma } from "@/lib/prisma";

export type StoryboardMotionProjectRow = {
  id: string;
  title: string | null;
  status: string;
  projectType: string;
  updatedAt: Date;
  latestExportStatus: string | null;
  latestExportVideoUrl: string | null;
};

export async function listStoryboardMotionProjects(
  storyboardId: string,
  ownerId: string
): Promise<StoryboardMotionProjectRow[]> {
  const rows = await prisma.animationProject.findMany({
    where: {
      studioSourceStoryboardId: storyboardId,
      ownerId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      projectType: true,
      updatedAt: true,
      exports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          outputVideoUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return rows.map((row) => {
    const latest = row.exports[0] ?? null;
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      projectType: row.projectType,
      updatedAt: row.updatedAt,
      latestExportStatus: latest?.status ?? null,
      latestExportVideoUrl: latest?.outputVideoUrl?.trim() || null,
    };
  });
}
