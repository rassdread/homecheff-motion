"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PublishOverlayWorkspace } from "@/components/publish/publish-overlay-workspace";
import { PublishSubtitlePanel } from "@/components/publish/publish-subtitle-panel";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { createPublishProject, loadPublishProject, savePublishProject } from "@/lib/publish-overlay-session";
import type { PublishProject } from "@/types/publish-overlay";

export function PublishProductPage() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? "";
  const videoUrl = searchParams.get("video") ?? "";
  const motionId = searchParams.get("motion") ?? "";
  const [projectOverride, setProjectOverride] = useState<PublishProject | null>(null);
  const [tab, setTab] = useState<"overlays" | "subtitles">("overlays");

  let project: PublishProject | null = projectOverride;
  if (!project && projectId) {
    project = loadPublishProject(projectId);
  }
  if (!project && videoUrl) {
    project = createPublishProject({
      name: t("publish.untitled"),
      videoUrl,
      source: motionId ? "motion" : "standalone",
      motionProjectId: motionId || undefined,
    });
    savePublishProject(project);
    router.replace(`/publish?project=${encodeURIComponent(project.id)}`);
  }

  const handleBack = () => {
    setProjectOverride(null);
    router.replace("/publish");
  };

  if (project) {
    return (
      <StudioAuthGate authTitleKey="publish.authTitle" authBodyKey="publish.authBody">
        <main className={`flex-1 ${brand.softGradientBg}`}>
          <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
            <div className="mb-4 flex gap-2">
              <button type="button" onClick={() => setTab("overlays")} className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === "overlays" ? "bg-[#0067B1] text-white" : "border"}`}>
                {t("publish.tab.overlays")}
              </button>
              <button type="button" onClick={() => setTab("subtitles")} className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === "subtitles" ? "bg-[#0067B1] text-white" : "border"}`}>
                {t("publish.tab.subtitles")}
              </button>
            </div>
            {tab === "overlays" ?
              <PublishOverlayWorkspace project={project} onProjectChange={setProjectOverride} onBack={handleBack} />
            : <PublishSubtitlePanel project={project} onProjectChange={setProjectOverride} />}
          </section>
        </main>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate authTitleKey="publish.authTitle" authBodyKey="publish.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-3xl px-6 py-12">
          <h1 className="text-3xl font-bold text-zinc-900">{t("publish.start.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("publish.start.lead")}</p>
          <label className="mt-6 block rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <span className="text-sm font-semibold text-zinc-700">{t("publish.start.upload")}</span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="mt-3 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }
                const url = URL.createObjectURL(file);
                const created = savePublishProject(
                  createPublishProject({ name: file.name.replace(/\.[^.]+$/, ""), videoUrl: url, source: "upload" })
                );
                router.push(`/publish?project=${encodeURIComponent(created.id)}`);
              }}
            />
          </label>
          <p className="mt-4 text-xs text-zinc-500">{t("publish.exportLimitation")}</p>
        </section>
      </main>
    </StudioAuthGate>
  );
}
