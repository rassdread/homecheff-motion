"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { InstantFinalProgressPanel } from "@/components/instant/instant-final-progress-panel";
import { VideoVersionsPanel } from "@/components/instant/video-versions-panel";
import { TextRerenderEditorModal } from "@/components/instant/text-rerender-editor-modal";
import { FullRerenderEditorModal } from "@/components/instant/full-rerender-editor-modal";
import { LanguageExportPanel } from "@/components/instant/language-export-panel";
import { ProjectRerenderChoices } from "@/components/videos/project-rerender-choices";
import { RenderActivityStatusCard } from "@/components/videos/render-activity-status-card";
import { VideoVersionDownloadTrigger } from "@/components/videos/project-storage-usage-card";
import { VideoPreview } from "@/components/ui/video-preview";
import { useActiveTranslator } from "@/i18n/client";
import {
  isInstantLikeMotionProject,
  shouldPollStudioMotionStatus,
} from "@/lib/studio-motion-project-display";
import {
  pickPrimaryMotionProject,
  useStudioMotionProjectDetail,
} from "@/hooks/use-studio-workspace-motion";
import { runQuickFullRerender } from "@/lib/quick-full-rerender";
import { postCopyProjectAsDraft } from "@/lib/copy-project-as-draft-client";
import type { StudioMotionProjectSummary } from "@/types/studio-api";
import type { StudioToolId } from "@/lib/studio-tool-id";

function runStudioQuickRerender(
  t: ReturnType<typeof useActiveTranslator>,
  projectId: string,
  onSuccess?: () => void
) {
  return runQuickFullRerender({
    projectId,
    confirmMessage: t("instant.fullRerender.confirmPromptQuick"),
    confirmMessageTestMode: t("instant.fullRerender.confirmPromptQuickTestMode"),
    abortedMessage: t("instant.fullRerender.aborted"),
    networkMessage: t("instant.fullRerender.failed"),
    failedMessage: t("instant.fullRerender.failed"),
  }).then((result) => {
    if (result.ok) {
      onSuccess?.();
    }
  });
}

export function MotionProjectsEmpty({ storyboardId }: { storyboardId: string }) {
  const t = useActiveTranslator();
  const importHref = `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}`;

  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
      <p className="text-base font-semibold text-zinc-900">{t("studio.workspace.motion.emptyTitle")}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{t("studio.workspace.motion.emptyHint")}</p>
      <Link
        href={importHref}
        prefetch={false}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005a44]"
      >
        {t("studio.workspace.openMotion")}
      </Link>
    </div>
  );
}

function MotionProjectPicker({
  projects,
  selectedId,
  onSelect,
}: {
  projects: StudioMotionProjectSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useActiveTranslator();
  if (projects.length <= 1) {
    return null;
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("studio.workspace.production.selectVideo")}
      </label>
      <select
        value={selectedId ?? ""}
        onChange={(event) => onSelect(event.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title?.trim() || t("studio.workspace.motion.untitledVideo")}
          </option>
        ))}
      </select>
    </div>
  );
}

function useSelectedMotionProject(projects: StudioMotionProjectSummary[]) {
  const primary = useMemo(() => pickPrimaryMotionProject(projects), [projects]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? primary?.id ?? null;
  const activeSummary = projects.find((project) => project.id === activeId) ?? primary;
  return { activeId, activeSummary, setSelectedId };
}

type MotionPanelShellProps = {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
  children: (ctx: ReturnType<typeof useStudioMotionProjectDetail> & { projectId: string }) => ReactNode;
};

function MotionPanelShell({ storyboardId, projects, loading, children }: MotionPanelShellProps) {
  const t = useActiveTranslator();
  const { activeId, setSelectedId } = useSelectedMotionProject(projects);
  const detailState = useStudioMotionProjectDetail(activeId, true);

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }
  if (!activeId) {
    return <MotionProjectsEmpty storyboardId={storyboardId} />;
  }

  return (
    <div className="space-y-4">
      <MotionProjectPicker projects={projects} selectedId={activeId} onSelect={setSelectedId} />
      {detailState.detailLoading ?
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      : detailState.detailError ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {detailState.detailError}
        </p>
      : detailState.detail ?
        children({ ...detailState, projectId: activeId })
      : null}
    </div>
  );
}

export function StudioWorkspaceProductionBanner({
  projects,
  onOpenRender,
}: {
  projects: StudioMotionProjectSummary[];
  onOpenRender?: () => void;
}) {
  const t = useActiveTranslator();
  const primary = pickPrimaryMotionProject(projects);
  if (!primary) {
    return null;
  }
  const statusLabel =
    primary.hasCompletedFinal ?
      t("studio.workspace.production.statusReady")
    : t("studio.workspace.production.statusRendering");

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.workspace.production.currentVideo")}
        </p>
        <p className="truncate text-sm font-semibold text-zinc-900">
          {primary.title?.trim() || t("studio.workspace.motion.untitledVideo")}
        </p>
        <p className="text-xs text-zinc-600">{statusLabel}</p>
      </div>
      {onOpenRender ?
        <button
          type="button"
          onClick={onOpenRender}
          className="shrink-0 rounded-full border border-[#0067B1]/30 bg-white px-4 py-2 text-xs font-semibold text-[#0067B1] hover:bg-white/80"
        >
          {t("studio.tools.render")}
        </button>
      : null}
    </div>
  );
}

export function StudioWorkspaceRenderPanel({
  storyboardId,
  projects,
  loading,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
}) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.render")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.render.hint")}</p>
      </div>
      <MotionPanelShell storyboardId={storyboardId} projects={projects} loading={loading}>
        {({
          detail,
          snapshot,
          lastPolledAtMs,
          lastProgressChangeAtMs,
          pollingError,
          pollNow,
          projectId,
          videoState,
          refresh,
        }) => {
          if (!detail) {
            return null;
          }
          const showProgress = shouldPollStudioMotionStatus(detail, false);
          const latestExport = detail.exports?.[0] ?? null;
          return (
            <div className="space-y-4">
              <RenderActivityStatusCard
                projectId={projectId}
                projectStatus={detail.status}
                exportStatus={latestExport?.status}
                outputVideoUrl={videoState?.finalVideoUrl}
                startedAtMs={detail.createdAt ? Date.parse(detail.createdAt) : null}
                lastUpdatedAtMs={lastPolledAtMs}
                lastProgressAtMs={lastProgressChangeAtMs}
                onActionComplete={() => {
                  void pollNow();
                  void refresh();
                }}
              />
              {showProgress || snapshot ?
                <InstantFinalProgressPanel
                  snapshot={snapshot}
                  lastPolledAtMs={lastPolledAtMs}
                  lastProgressChangeAtMs={lastProgressChangeAtMs}
                  connectionState={showProgress ? "polling" : "completed"}
                  hideRecoveryActions
                  hideAdminDiagnostics
                  compactProgressOnly
                  showUnifiedRepair={false}
                  pollingError={pollingError ?? undefined}
                />
              : null}
              {videoState?.finalVideoUrl ?
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    {t("studio.workspace.production.currentVideo")}
                  </p>
                  <VideoPreview
                    variant="main"
                    className="mt-3 overflow-hidden rounded-xl border border-zinc-200"
                    controls
                    playsInline
                    preload="none"
                    src={videoState.finalVideoUrl}
                  />
                </div>
              : null}
            </div>
          );
        }}
      </MotionPanelShell>
    </div>
  );
}

export function StudioWorkspaceVersionsPanel({
  storyboardId,
  projects,
  loading,
  onSwitchTool,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
  onSwitchTool?: (tool: StudioToolId) => void;
}) {
  const t = useActiveTranslator();
  const [rebuildBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.versions")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.versions.hint")}</p>
      </div>
      <MotionPanelShell storyboardId={storyboardId} projects={projects} loading={loading}>
        {({
          detail,
          projectId,
          languageExports,
          setLanguageExports,
          videoState,
          refresh,
        }) => {
          if (!detail) {
            return null;
          }
          if (!videoState?.hasCompletedFinal) {
            return (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">{t("studio.workspace.versions.waitForRender")}</p>
                {onSwitchTool ?
                  <button
                    type="button"
                    onClick={() => onSwitchTool("render")}
                    className="text-sm font-semibold text-[#0067B1] hover:underline"
                  >
                    {t("studio.workspace.versions.openRenderStatus")}
                  </button>
                : null}
              </div>
            );
          }
          return (
            <div className="space-y-6">
              <VideoVersionsPanel
                projectId={projectId}
                layout="detail"
                hideOriginalVideoPlayer
                cleanVideoUrl={videoState.cleanVideoUrl}
                finalVideoUrl={videoState.finalVideoUrl}
                usesStoryOverlay={videoState.usesStoryOverlay}
                instantSceneTexts={detail.instantSceneTexts}
                images={(detail.images ?? []).map((image) => ({
                  id: image.id,
                  previewUrl: image.previewUrl ?? "",
                }))}
                languageExports={languageExports}
                onLanguageExportsChange={setLanguageExports}
                onTextsRerendered={() => void refresh()}
                textRerenderBusy={rebuildBusy}
                rebuildCount={detail.instantFinalRebuildCount ?? 0}
                previousFinalVideoUrl={detail.instantPreviousFinalVideoUrl ?? null}
                textVersionNotesJson={detail.instantTextVersionNotesJson}
                finalIsArchivedFallback={videoState.videoDisplay.finalIsArchivedFallback}
                cleanIsLatestBareOnly={videoState.videoDisplay.cleanIsLatestBareOnly}
                bundleCatalog={videoState.motionCatalog}
              />
              <p className="text-xs text-zinc-500">
                {t("studio.workspace.versions.advancedLink")}{" "}
                <Link
                  href={`/videos/${encodeURIComponent(projectId)}/versions`}
                  prefetch={false}
                  className="font-semibold text-[#0067B1] hover:underline"
                >
                  {t("studio.workspace.versions.advancedLinkLabel")}
                </Link>
              </p>
            </div>
          );
        }}
      </MotionPanelShell>
    </div>
  );
}

export function StudioWorkspaceDownloadPanel({
  storyboardId,
  projects,
  loading,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
}) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.export")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.export.embeddedHint")}</p>
      </div>
      <MotionPanelShell storyboardId={storyboardId} projects={projects} loading={loading}>
        {({ detail, projectId, languageExports, videoState }) => {
          if (!detail) {
            return null;
          }
          if (!videoState?.hasCompletedFinal) {
            return <p className="text-sm text-zinc-600">{t("studio.workspace.export.waitForVideo")}</p>;
          }
          return (
            <div className="space-y-4">
              {videoState.finalVideoUrl ?
                <VideoPreview
                  variant="main"
                  className="overflow-hidden rounded-xl border border-zinc-200"
                  controls
                  playsInline
                  preload="none"
                  src={videoState.finalVideoUrl}
                />
              : null}
              <VideoVersionDownloadTrigger
                projectId={projectId}
                originalVideoUrl={videoState.finalVideoUrl}
                cleanVideoUrl={videoState.cleanVideoUrl}
                languageExports={languageExports}
              />
            </div>
          );
        }}
      </MotionPanelShell>
    </div>
  );
}

export function StudioWorkspaceTranslatePanelEmbedded({
  storyboardId,
  projects,
  loading,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
}) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.tools.translate")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.workspace.translate.hint")}</p>
      </div>
      <MotionPanelShell storyboardId={storyboardId} projects={projects} loading={loading}>
        {({ detail, projectId, languageExports, setLanguageExports, videoState }) => {
          if (!detail) {
            return null;
          }
          if (!videoState?.hasCompletedFinal) {
            return <p className="text-sm text-zinc-600">{t("studio.workspace.translate.waitForVideo")}</p>;
          }
          return (
            <LanguageExportPanel
              projectId={projectId}
              hasCompletedFinal={videoState.hasCompletedFinal}
              languageExports={languageExports}
              onLanguageExportsChange={setLanguageExports}
              bundleCatalog={videoState.motionCatalog}
            />
          );
        }}
      </MotionPanelShell>
    </div>
  );
}

export function StudioWorkspaceTextProductionPanel({
  storyboardId,
  projects,
  loading,
  onSwitchTool,
}: {
  storyboardId: string;
  projects: StudioMotionProjectSummary[];
  loading: boolean;
  onSwitchTool?: (tool: StudioToolId) => void;
}) {
  const t = useActiveTranslator();
  const [textRerenderOpen, setTextRerenderOpen] = useState(false);
  const [fullRerenderOpen, setFullRerenderOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <MotionPanelShell storyboardId={storyboardId} projects={projects} loading={loading}>
        {({ detail, projectId, videoState, refresh }) => {
          if (!detail) {
            return null;
          }
          const canEditText =
            videoState?.hasCompletedFinal &&
            videoState.usesStoryOverlay &&
            isInstantLikeMotionProject(detail);
          const canFullRerender =
            detail.projectType === "instant_premium" && (detail.images?.length ?? 0) > 0;

          if (!canEditText && !canFullRerender) {
            return null;
          }

          return (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-900">
                {t("studio.workspace.production.editTextTitle")}
              </h3>
              <p className="mt-1 text-xs text-zinc-600">{t("studio.workspace.production.editTextHint")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {canEditText ?
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setTextRerenderOpen(true)}
                    className="rounded-lg bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {t("studio.workspace.production.editText")}
                  </button>
                : null}
                {onSwitchTool ?
                  <button
                    type="button"
                    onClick={() => onSwitchTool("versions")}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800"
                  >
                    {t("studio.tools.versions")}
                  </button>
                : null}
              </div>
              {canFullRerender ?
                <div className="mt-6 border-t border-zinc-100 pt-4">
                  <h4 className="text-sm font-semibold text-zinc-900">
                    {t("studio.workspace.production.rebuildTitle")}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-600">{t("studio.workspace.production.rebuildHint")}</p>
                  <div className="mt-3">
                    <ProjectRerenderChoices
                      disabled={busy}
                      quickBusy={busy}
                      onQuickRerender={() => {
                        setBusy(true);
                        void runStudioQuickRerender(t, projectId, () => {
                          void refresh();
                          onSwitchTool?.("render");
                        }).finally(() => setBusy(false));
                      }}
                      onCopyAsConcept={() => {
                        setBusy(true);
                        void postCopyProjectAsDraft(projectId).finally(() => setBusy(false));
                      }}
                      onTextOnlyAdjust={canEditText ? () => setTextRerenderOpen(true) : undefined}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setFullRerenderOpen(true)}
                      className="mt-3 text-sm font-semibold text-[#0067B1] hover:underline disabled:opacity-60"
                    >
                      {t("studio.workspace.production.rebuildAdvanced")}
                    </button>
                  </div>
                </div>
              : null}
              {canEditText ?
                <TextRerenderEditorModal
                  open={textRerenderOpen}
                  onClose={() => setTextRerenderOpen(false)}
                  projectId={projectId}
                  instantSceneTexts={detail.instantSceneTexts}
                  images={(detail.images ?? []).map((image) => ({
                    id: image.id,
                    previewUrl: image.previewUrl ?? "",
                  }))}
                  imageCount={detail.images?.length}
                  bundleCatalog={videoState?.motionCatalog ?? null}
                  onRenderStart={() => setBusy(true)}
                  onSuccess={() => {
                    setBusy(false);
                    void refresh();
                    onSwitchTool?.("render");
                  }}
                  onError={() => setBusy(false)}
                />
              : null}
              {canFullRerender ?
                <FullRerenderEditorModal
                  open={fullRerenderOpen}
                  onClose={() => setFullRerenderOpen(false)}
                  projectId={projectId}
                  instantSceneTexts={detail.instantSceneTexts}
                  instantMode={detail.instantMode}
                  instantUserIntent={detail.instantUserIntent}
                  instantTransitionSeconds={detail.instantTransitionSeconds ?? 5}
                  uploadRole="user"
                  images={(detail.images ?? []).map((image) => ({
                    id: image.id,
                    previewUrl: image.previewUrl ?? "",
                  }))}
                  imageCount={detail.images?.length}
                  onRenderStart={() => setBusy(true)}
                  onSuccess={() => {
                    setBusy(false);
                    void refresh();
                    onSwitchTool?.("render");
                  }}
                  onError={() => setBusy(false)}
                />
              : null}
            </section>
          );
        }}
      </MotionPanelShell>
    </>
  );
}
