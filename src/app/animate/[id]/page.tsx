import { notFound } from "next/navigation";
import { ProjectLiveStatus } from "@/components/animations/project-live-status";
import { GradientButton } from "@/components/ui/gradient-button";
import { getActiveTranslator } from "@/i18n";
import { brand } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnimationProjectDetailPage({ params }: PageProps) {
  const t = getActiveTranslator();
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

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-emerald-700">{brand.productName}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("projectDetail.title")}
          </h1>
        </div>

        <ProjectLiveStatus projectId={project.id} initialProject={project} />

        <div className="mx-auto mt-10 max-w-3xl">
          <GradientButton href="/animate" className="w-full">
            {t("projectDetail.back")}
          </GradientButton>
        </div>
      </section>
    </main>
  );
}
