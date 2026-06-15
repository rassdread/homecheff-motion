"use client";


import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublishModuleWorkspace } from "@/components/publish/publish-module-workspace";
import { PublishWizardShell } from "@/components/publish/publish-wizard-shell";
import { PublishOverlayWorkspace } from "@/components/publish/publish-overlay-workspace";
import { PublishSubtitlePanel } from "@/components/publish/publish-subtitle-panel";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import {
  editorHandoffHasPublishPayload,
  hydratePublishProjectFromEditorHandoff,
} from "@/lib/editor-publish-handoff-hydrate";
import { loadHcProjectFromQuery, hydratePublishFromHcProject } from "@/lib/homecheff-project-open";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  nextPublishWizardStep,
  prevPublishWizardStep,
  hydratePublishWizardFromProject,
  publishWizardCanAdvance,
  type PublishWizardStepId,
  type PublishWizardState,
} from "@/lib/publish-wizard-flow";
import { autoPrepareHcHandoff } from "@/lib/hc-project-continuity";
import { PublishStartIntake } from "@/components/publish/publish-start-intake";
import { PublishWizardStepPanels } from "@/components/publish/publish-wizard-step-panels";
import { CrossServiceContinuityBar } from "@/components/platform/cross-service-continuity-bar";
import { HcProjectAutoCreateBridge } from "@/components/projects/hc-project-auto-create-bridge";
import { HcProjectWorkspaceControls } from "@/components/projects/hc-project-workspace-controls";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ServiceLandingNav } from "@/components/suite/service-landing-nav";
import { createPublishProject, loadPublishProject, savePublishProject } from "@/lib/publish-overlay-session";
import type { PublishProject } from "@/types/publish-overlay";

export function PublishProductPage() {
  const t = useActiveTranslator();
  const auth = useAuthSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? "";
  const videoUrl = searchParams.get("video") ?? "";
  const motionId = searchParams.get("motion") ?? "";
  const [projectOverride, setProjectOverride] = useState<PublishProject | null>(null);
  const intentTab = useMemo(() => {
    const intent = searchParams.get("publishIntent");
    return intent === "subtitles" || intent === "voice" || intent === "music" ? "subtitles" : "overlays";
  }, [searchParams]);
  const [tabOverride, setTabOverride] = useState<"overlays" | "subtitles" | null>(null);
  const tab = tabOverride ?? intentTab;
  const [wizardStep, setWizardStep] = useState<PublishWizardStepId>("upload");
  const [wizardState, setWizardState] = useState<PublishWizardState>({ step: "intent" });
  const [mediaFocusSection, setMediaFocusSection] = useState<import("@/types/publish-media-production").PublishProductionSectionId | null>(null);

  const handleProjectChange = useCallback((next: PublishProject) => {
    setProjectOverride(savePublishProject(next));
  }, [setProjectOverride]);

  const hydratedProjectIdRef = useRef<string | null>(null);

  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";

  const hcProject = useMemo(() => {
    const fromQuery = loadHcProjectFromQuery(searchParams);
    if (fromQuery) return fromQuery;
    if (hcProjectId) return loadHomeCheffProject(hcProjectId);
    return null;
  }, [hcProjectId, searchParams]);
  const [hcProjectState, setHcProjectState] = useState<typeof hcProject>(null);
  const activeHcProject = hcProjectState ?? hcProject;

  const editorHandoffProject = useMemo(() => {
    if (projectOverride || projectId || videoUrl) {
      return null;
    }
    const hcProject = loadHcProjectFromQuery(searchParams);
    if (hcProject) {
      return hydratePublishFromHcProject(hcProject);
    }
    return hydratePublishProjectFromEditorHandoff(searchParams);
  }, [projectId, projectOverride, searchParams, videoUrl]);

  const handoffMissingAssets = useMemo(() => {
    if (projectOverride || projectId || videoUrl || editorHandoffProject) {
      return false;
    }
    return editorHandoffHasPublishPayload(searchParams);
  }, [editorHandoffProject, projectId, projectOverride, searchParams, videoUrl]);

  let project: PublishProject | null = projectOverride;
  if (!project && projectId) {
    project = loadPublishProject(projectId);
  }
  if (!project && editorHandoffProject) {
    project = editorHandoffProject;
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

  useEffect(() => {
    if (!hcProject || searchParams.get("handoff") !== "1") return;
    const intake = hcProject.workflowState.publishIntake as { entryMode?: string } | undefined;
    autoPrepareHcHandoff(hcProject, "publish", {
      publishIntent: intake?.entryMode ?? project?.publishIntent,
    });
  }, [hcProject, searchParams, project?.publishIntent]);

  useEffect(() => {
    if (!project) {
      hydratedProjectIdRef.current = null;
      return;
    }
    if (hydratedProjectIdRef.current === project.id) return;
    hydratedProjectIdRef.current = project.id;

    const plan = project.metadata?.changePlan ?? project.metadata?.publishChangePlan;
    const hasProposal = Boolean(plan && typeof plan === "object");
    const intake = hcProject?.workflowState.publishIntake as { description?: string; entryMode?: string } | undefined;
    setWizardState(
      hydratePublishWizardFromProject({
        publishIntent: project.publishIntent ?? intake?.description ?? intake?.entryMode,
        hcProjectId: hcProjectId || undefined,
        hasMedia: Boolean(project.videoUrl || project.imageUrl || project.imageUrls?.length),
        hasProposal,
      })
    );
    setWizardStep(
      hasProposal ? "media"
      : project.publishIntent ? "analyze"
      : project.videoUrl || project.imageUrl ? "intent"
      : "upload"
    );
  }, [project?.id, hcProjectId, hcProject, project]);

  useEffect(() => {
    if (project && !projectId && (project.source === "editor" || hcProjectId)) {
      const params = new URLSearchParams();
      params.set("project", project.id);
      if (hcProjectId) params.set("hcProject", hcProjectId);
      router.replace(`/publish?${params.toString()}`);
    }
  }, [hcProjectId, project, projectId, router]);

  const handleBack = () => {
    hydratedProjectIdRef.current = null;
    setProjectOverride(null);
    router.replace("/publish");
  };

  if (project) {
    const activeModule = tab === "subtitles" ? "subtitles" : "social";

    return (
      <StudioAuthGate authTitleKey="publish.authTitle" authBodyKey="publish.authBody">
        <main className={`flex-1 ${brand.softGradientBg}`}>
          <HcProjectAutoCreateBridge
            sourceModule="publish"
            publishProjectId={project.id}
          />
          <HcProjectWorkspaceControls
            project={activeHcProject}
            onProjectChange={setHcProjectState}
            sourceModule="publish"
            ownerId={auth.user?.id}
            syncToServer={Boolean(auth.user)}
            closeHref="/publish"
          />
          <div className="mx-auto max-w-6xl px-4 pt-4">
            <ServiceLandingNav current="publish" />
            <CrossServiceContinuityBar hcProjectId={hcProjectId || activeHcProject?.id} currentService="publish" />
          </div>
          <PublishModuleWorkspace
            project={project}
            module={activeModule}
            hcProjectId={hcProjectId}
            center={
              <div className="space-y-4">
                <PublishWizardShell
                  step={wizardStep}
                  onStepChange={setWizardStep}
                  canAdvance={publishWizardCanAdvance(wizardState, wizardStep)}
                  onBack={prevPublishWizardStep(wizardStep) ? () => setWizardStep(prevPublishWizardStep(wizardStep)!) : undefined}
                  onNext={
                    nextPublishWizardStep(wizardStep) && publishWizardCanAdvance(wizardState, wizardStep)
                      ? () => setWizardStep(nextPublishWizardStep(wizardStep)!)
                      : undefined
                  }
                >
                  <PublishWizardStepPanels
                    step={wizardStep}
                    project={project}
                    wizard={wizardState}
                    hcProject={hcProject}
                    onWizardChange={setWizardState}
                    onProjectChange={handleProjectChange}
                    mediaFocusSection={mediaFocusSection}
                    onJumpToMedia={(section) => {
                      setMediaFocusSection(section);
                      setWizardStep("media");
                    }}
                  />
                </PublishWizardShell>
                {wizardStep === "media" || wizardStep === "review" || wizardStep === "export" ?
                  <>
                    <p className="text-xs font-semibold uppercase text-zinc-500">{t("publish.wizard.advancedEdit" as never)}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setTabOverride("overlays")} className={tab === "overlays" ? studioVisual.editorTabActive : studioVisual.editorTabInactive}>
                        {t("publish.tab.overlays")}
                      </button>
                      <button type="button" onClick={() => setTabOverride("subtitles")} className={tab === "subtitles" ? studioVisual.editorTabActive : studioVisual.editorTabInactive}>
                        {t("publish.tab.subtitles")}
                      </button>
                    </div>
                    {tab === "overlays" ?
                      <PublishOverlayWorkspace
                        project={project}
                        hcProject={hcProject}
                        onProjectChange={handleProjectChange}
                        onBack={handleBack}
                      />
                    : <PublishSubtitlePanel project={project} onProjectChange={handleProjectChange} />}
                  </>
                : null}
              </div>
            }
          />
        </main>
      </StudioAuthGate>
    );
  }

  return (
    <StudioAuthGate authTitleKey="publish.authTitle" authBodyKey="publish.authBody">
      <main className={`flex-1 ${studioVisual.pageBg}`}>
        <HcProjectAutoCreateBridge sourceModule="publish" />
        <HcProjectWorkspaceControls
          project={activeHcProject}
          onProjectChange={setHcProjectState}
          sourceModule="publish"
          ownerId={auth.user?.id}
          syncToServer={Boolean(auth.user)}
          closeHref="/publish"
        />
        <section className="mx-auto w-full max-w-3xl px-6 py-12">
          <ServiceLandingNav current="publish" />
          <h1 className={`text-3xl ${studioVisual.headingOnDark}`}>{t("publish.start.title")}</h1>
          <p className={`mt-2 text-sm ${studioVisual.bodyOnDark}`}>{t("publish.start.leadExpanded" as never)}</p>
          {handoffMissingAssets ?
            <p className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {t("publish.handoff.missingAssets" as never)}
            </p>
          : null}
          <PublishStartIntake hcProjectId={hcProjectId || undefined} />
          <p className={`mt-4 text-xs ${studioVisual.bodyOnDark}`}>{t("publish.exportLimitation")}</p>
        </section>
      </main>
    </StudioAuthGate>
  );
}
