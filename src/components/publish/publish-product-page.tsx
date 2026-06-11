"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PublishOverlayWorkspace } from "@/components/publish/publish-overlay-workspace";
import { PublishSubtitlePanel } from "@/components/publish/publish-subtitle-panel";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";
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
              <button type="button" onClick={() => setTab("overlays")} className={tab === "overlays" ? studioVisual.editorTabActive : studioVisual.editorTabInactive}>
                {t("publish.tab.overlays")}
              </button>
              <button type="button" onClick={() => setTab("subtitles")} className={tab === "subtitles" ? studioVisual.editorTabActive : studioVisual.editorTabInactive}>
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
          <h1 className="text-3xl font-bold text-white">{t("publish.start.title")}</h1>
          <p className="mt-2 text-sm text-white/70">{t("publish.start.lead")}</p>
          <label className={`mt-6 block border-dashed p-8 text-center ${studioVisual.editorSurface}`}>
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
