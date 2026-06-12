"use client";

import { ReactNode } from "react";
import { HomeCheffWorkspaceShell } from "@/components/workspace/homecheff-workspace-shell";
import { HomeCheffWorkspaceTopBar } from "@/components/workspace/homecheff-workspace-top-bar";
import { useActiveTranslator } from "@/i18n/client";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { PUBLISH_MODULE_LABEL_KEYS, type PublishModuleId } from "@/lib/publish-wizard-flow";
import { workspaceVisual } from "@/lib/homecheff-workspace-tokens";
import type { PublishProject } from "@/types/publish-overlay";

type Props = {
  project: PublishProject;
  module: PublishModuleId;
  left?: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  hcProjectId?: string;
};

export function PublishModuleWorkspace({
  project,
  module,
  left,
  center,
  right,
  bottom,
  hcProjectId,
}: Props) {
  const t = useActiveTranslator();
  const hcProject = hcProjectId ? loadHomeCheffProject(hcProjectId) : null;

  const defaultLeft = (
    <div className="space-y-2 text-xs text-zinc-600">
      <p className="font-bold uppercase tracking-wider text-zinc-500">{t("platform.workspace.assets" as never)}</p>
      {project.videoUrl ?
        <p className="truncate">{project.videoUrl}</p>
      : null}
      {project.imageUrl ?
        <img src={project.imageUrl} alt="" className="w-full rounded-lg border border-zinc-200" />
      : null}
    </div>
  );

  return (
    <>
      <HomeCheffWorkspaceTopBar
        service="publish"
        projectTitle={project.name}
        hcProject={hcProject}
        workflowStatus={t(PUBLISH_MODULE_LABEL_KEYS[module] as never)}
        breadcrumbs={["presentation"]}
      />
      <HomeCheffWorkspaceShell
        left={left ?? defaultLeft}
        center={<div className={workspaceVisual.glassPanel}>{center}</div>}
        right={right}
        bottom={bottom}
      />
    </>
  );
}
