"use client";

import { useMemo, useState } from "react";
import { PublishAiAssistantPanel } from "@/components/publish/publish-ai-assistant-panel";
import { PublishTimelinePanel } from "@/components/publish/publish-timeline-panel";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import { loadPublishChangePlanFromMetadata } from "@/lib/publish-change-plan-apply";
import { loadPublishTimelineFromProject, savePublishTimelineToProject } from "@/lib/publish-timeline";
import type { PublishWizardStepId, PublishWizardState } from "@/lib/publish-wizard-flow";
import { analyzePublishVideoFrames } from "@/lib/publish-video-analysis";
import { buildPublishAiProposal } from "@/lib/publish-ai-assistant";
import { exportPublishProject } from "@/lib/publish-export-client";
import { isPhotoStoryProject, isSlideshowProject } from "@/lib/publish-photo-story";
import { isPublishAiEverythingProject } from "@/lib/publish-ai-everything";
import { isAudioWithImageProject, isVoiceMessageProject } from "@/lib/publish-audio-workflows";
import { syncPublishExportToHc, syncPublishProjectToHc } from "@/lib/publish-hc-sync";
import { persistHcWorkflowV2WithSync } from "@/lib/hc-workflow-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { PublishProject } from "@/types/publish-overlay";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  step: PublishWizardStepId;
  project: PublishProject;
  wizard: PublishWizardState;
  hcProject?: HomeCheffProjectPackage | null;
  onWizardChange: (next: PublishWizardState) => void;
  onProjectChange: (project: PublishProject) => void;
  playhead?: number;
};

function syncWizardFromProject(project: PublishProject, wizard: PublishWizardState): PublishWizardState {
  const hasMedia = Boolean(project.videoUrl || project.imageUrl || project.imageUrls?.length);
  const plan = loadPublishChangePlanFromMetadata(project);
  const timeline = loadPublishTimelineFromProject(project);
  return {
    ...wizard,
    uploadReady: hasMedia,
    analyzeComplete: Boolean(project.metadata?.publishAnalysisComplete) || Boolean(plan),
    proposalReady: Boolean(plan?.segments.length) || timeline.items.length > 0,
    reviewReady: timeline.items.length > 0 || project.overlays.length > 0,
  };
}

export function PublishWizardStepPanels({
  step,
  project,
  wizard,
  hcProject,
  onWizardChange,
  onProjectChange,
  playhead = 0,
}: Props) {
  const t = useActiveTranslator();
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const timeline = useMemo(() => loadPublishTimelineFromProject(project), [project]);
  const intake = (project.metadata?.intakeFiles as Array<{ name: string; labels: string[] }>) ?? [];

  const patchWizard = (patch: Partial<PublishWizardState>) => {
    onWizardChange(syncWizardFromProject(project, { ...wizard, ...patch }));
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 400));
    const analysis = analyzePublishVideoFrames({
      durationSec: project.durationSeconds || 5,
      hasExistingText: project.overlays.some((o) => o.text?.trim()),
    });
    onProjectChange({
      ...project,
      metadata: { ...project.metadata, publishAnalysisComplete: true, publishAnalysis: analysis },
      updatedAt: new Date().toISOString(),
    });
    patchWizard({ analyzeComplete: true });
    setAnalyzing(false);
  };

  if (step === "upload") {
    return (
      <div className="space-y-2 text-sm text-zinc-700">
        <p>{t("publish.wizard.help.upload" as never)}</p>
        {project.videoUrl ?
          <p><span className="font-semibold">Video:</span> {project.name}</p>
        : null}
        {project.imageUrl ?
          <p><span className="font-semibold">Image:</span> {project.imageUrl.split("/").pop()}</p>
        : null}
        {project.imageUrls?.length ?
          <p><span className="font-semibold">Slides:</span> {project.imageUrls.length}</p>
        : null}
        {intake.map((f) => (
          <p key={f.name}>{f.name} — {f.labels.join(", ")}</p>
        ))}
        {!project.videoUrl && !project.imageUrl && intake.length === 0 ?
          <p className="text-amber-800">{t("publish.wizard.uploadEmpty" as never)}</p>
        : null}
      </div>
    );
  }

  if (step === "intent") {
    return (
      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase text-zinc-500">{t("publish.wizard.intent" as never)}</span>
        <p className="text-sm text-zinc-600">{t("publish.wizard.intentLead" as never)}</p>
        <textarea
          value={wizard.intent ?? project.publishIntent ?? ""}
          onChange={(e) => {
            const intent = e.target.value;
            onWizardChange(syncWizardFromProject(project, { ...wizard, intent }));
            onProjectChange({ ...project, publishIntent: intent, updatedAt: new Date().toISOString() });
          }}
          rows={4}
          className="hc-stable-field w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          placeholder={t("publish.start.descriptionPlaceholder" as never)}
        />
      </label>
    );
  }

  if (step === "analyze") {
    if (analyzing) {
      return <HomeCheffOrbitLoader state="analyzing" size="md" message={t("publish.ai.analyzing" as never)} />;
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-700">{t("publish.wizard.help.analyze" as never)}</p>
        {wizard.analyzeComplete || project.metadata?.publishAnalysisComplete ?
          <p className="text-sm font-medium text-emerald-800">{t("publish.wizard.analyzeDone" as never)}</p>
        : (
          <button type="button" onClick={() => void runAnalysis()} className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white">
            {t("publish.ai.analyze" as never)}
          </button>
        )}
      </div>
    );
  }

  if (step === "proposal") {
    return (
      <PublishAiAssistantPanel
        project={project}
        hcProject={hcProject}
        onPlanSaved={(next) => {
          onProjectChange(next);
          patchWizard({ proposalReady: true });
        }}
      />
    );
  }

  if (step === "review") {
    const proposal = buildPublishAiProposal({ project, hcProject });
    const showScenes =
      isPhotoStoryProject(project) ||
      isSlideshowProject(project) ||
      isPublishAiEverythingProject(project) ||
      isVoiceMessageProject(project) ||
      isAudioWithImageProject(project);
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">{t("publish.wizard.help.review" as never)}</p>
        {showScenes && proposal.scenes.length > 0 ?
          <ul className="space-y-2" data-testid="publish-review-scenes">
            {proposal.scenes.map((scene) => (
              <li key={scene.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <p className="text-xs font-bold uppercase text-sky-800">
                  {t("publish.ai.scene.label" as never, { index: scene.index } as never)} · {scene.title}
                </p>
                <p className="mt-1 font-medium text-zinc-900">{scene.overlayText}</p>
                <p className="text-zinc-600">{scene.voiceLine}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {scene.startTime.toFixed(1)}s – {scene.endTime.toFixed(1)}s · {scene.visualIntent}
                </p>
              </li>
            ))}
          </ul>
        : null}
        <ul className="space-y-1 text-sm text-zinc-700">
          <li>{t("publish.wizard.intent" as never)}: {wizard.intent ?? project.publishIntent ?? "—"}</li>
          <li>{t("publish.tab.overlays")}: {project.overlays.length}</li>
          <li>{t("publish.tab.subtitles")}: {project.subtitles.length}</li>
          <li>{t("publish.timeline.title" as never)}: {timeline.items.length}</li>
        </ul>
        <PublishTimelinePanel
          timeline={timeline}
          playhead={playhead}
          reviewMode
          onPatchItem={(id, patch) => {
            onProjectChange(
              savePublishTimelineToProject(project, {
                ...timeline,
                items: timeline.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
                pendingRender: true,
                updatedAt: new Date().toISOString(),
              })
            );
          }}
        />
        <p className="text-xs text-zinc-500">{t("publish.wizard.reviewFineTune" as never)}</p>
      </div>
    );
  }

  const renderReady =
    project.workflow === "photo_story" || project.workflow === "slideshow"
      ? Boolean(project.imageUrl || project.imageUrls?.length)
      : Boolean(project.videoUrl || project.imageUrl);
  const runExport = async () => {
    setExporting(true);
    setExportMsg("");
    const result = await exportPublishProject(project);
    setExporting(false);
    if (result.ok && result.downloadUrl) {
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `${project.name}-publish.mp4`;
      link.click();
      URL.revokeObjectURL(result.downloadUrl);
      if (hcProject) {
        const plan = loadPublishChangePlanFromMetadata(project);
        const synced = syncPublishExportToHc(hcProject, project, result.downloadUrl);
        persistHcWorkflowV2WithSync(syncPublishProjectToHc(synced, project, { changePlan: plan }), {});
      }
      setExportMsg(t("publish.exportSuccess"));
    } else {
      setExportMsg(t((result.errorKey ?? "publish.exportFallback") as never));
    }
  };

  return (
    <div className="space-y-3 text-sm text-zinc-700">
      {renderReady ?
        <p className="font-medium text-emerald-800">{t("publish.export.renderReady" as never)}</p>
      : (
        <p className="text-amber-800">{t("publish.exportLimitation")}</p>
      )}
      {timeline.pendingRender ?
        <p className="text-xs text-zinc-500">{t("publish.ai.pendingRender" as never)}</p>
      : null}
      <button
        type="button"
        disabled={exporting || !renderReady}
        onClick={() => void runExport()}
        className={`min-h-11 disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
      >
        {exporting ? t("button.loading") : t("publish.export")}
      </button>
      {exportMsg ? <p className="text-xs text-zinc-600">{exportMsg}</p> : null}
    </div>
  );
}
