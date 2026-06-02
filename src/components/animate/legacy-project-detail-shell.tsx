"use client";

import type { ComponentProps } from "react";
import { ProjectLiveStatus } from "@/components/animations/project-live-status";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

type LegacyProject = ComponentProps<typeof ProjectLiveStatus>["initialProject"];

type LegacyProjectDetailShellProps = {
  project: LegacyProject;
};

export function LegacyProjectDetailShell({ project }: LegacyProjectDetailShellProps) {
  const t = useActiveTranslator();

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
          <GradientButton href="/animate/instant" className="w-full">
            {t("projectDetail.back")}
          </GradientButton>
        </div>
      </section>
    </main>
  );
}
