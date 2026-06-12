"use client";

import { ReactNode } from "react";
import { CrossServiceContinuityBar } from "@/components/platform/cross-service-continuity-bar";
import { MotionPostGenerationActionCenter } from "@/components/motion/motion-post-generation-action-center";
import { HomeCheffWorkspaceShell } from "@/components/workspace/homecheff-workspace-shell";
import { HomeCheffWorkspaceTopBar } from "@/components/workspace/homecheff-workspace-top-bar";
import { useActiveTranslator } from "@/i18n/client";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { motionGenerationPackageFromHc } from "@/lib/motion-next-best-actions";
import { workspaceVisual } from "@/lib/homecheff-workspace-tokens";

type Props = {
  projectId: string;
  projectTitle?: string;
  videoUrl: string;
  hcProjectId?: string;
  editorSessionId?: string;
  center: ReactNode;
  right?: ReactNode;
};

export function MotionResultsWorkspace({
  projectId,
  projectTitle,
  videoUrl,
  hcProjectId,
  editorSessionId,
  center,
  right,
}: Props) {
  const t = useActiveTranslator();
  const hcProject = hcProjectId ? loadHomeCheffProject(hcProjectId) : null;
  const pkg = motionGenerationPackageFromHc(hcProject);
  const frameUrls = pkg?.orderedFrameUrls ?? pkg?.sequenceFrames.map((f) => f.url) ?? [];

  const left = (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        {t("platform.workspace.references" as never)}
      </h3>
      {frameUrls.length > 0 ?
        <div className="flex gap-2 overflow-x-auto pb-1">
          {frameUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover"
            />
          ))}
        </div>
      : (
        <p className="text-xs text-zinc-500">{t("motion.workspace.noReferences" as never)}</p>
      )}
      {pkg ?
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("platform.generationPackage.label" as never)}
          </h3>
          <p className="text-xs text-zinc-700">{pkg.id}</p>
        </div>
      : null}
    </div>
  );

  return (
    <>
      {hcProjectId ?
        <div className="border-b border-zinc-200 bg-white px-4 py-2">
          <CrossServiceContinuityBar hcProjectId={hcProjectId} currentService="motion" />
        </div>
      : null}
      <HomeCheffWorkspaceTopBar
        service="motion"
        projectTitle={projectTitle ?? t("motion.workspace.defaultTitle" as never)}
        hcProject={hcProject}
        workflowStatus={t("motion.workspace.complete" as never)}
        breadcrumbs={["motion"]}
      />
      <HomeCheffWorkspaceShell
        left={left}
        center={<div className={workspaceVisual.glassPanel}>{center}</div>}
        right={right}
        bottom={
          <MotionPostGenerationActionCenter
            projectId={projectId}
            videoUrl={videoUrl}
            hcProjectId={hcProjectId}
            editorSessionId={editorSessionId}
            frameUrls={frameUrls}
          />
        }
      />
    </>
  );
}
