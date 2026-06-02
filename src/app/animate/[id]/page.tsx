import { notFound } from "next/navigation";
import { LegacyProjectDetailShell } from "@/components/animate/legacy-project-detail-shell";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnimationProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const project = await prisma.animationProject.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { order: "asc" },
      },
      transitions: {
        orderBy: { order: "asc" },
      },
      exports: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return <LegacyProjectDetailShell project={project} />;
}
