"use client";

import { useActiveTranslator } from "@/i18n/client";
import { readHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import { resolveHcProjectLastService } from "@/lib/homecheff-project-state";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  project: HomeCheffProjectPackage;
};

const TYPE_LABEL: Record<string, string> = {
  editor: "hcProject.state.editor",
  studio: "hcProject.state.studio",
  motion: "hcProject.state.motion",
  publish: "hcProject.state.publish",
};

const WORKFLOW_LABEL: Record<string, string> = {
  concept: "projects.hub.workflow.concept",
  in_progress: "projects.hub.workflow.in_progress",
  motion_ready: "projects.hub.workflow.motion_ready",
  publish_ready: "projects.hub.workflow.publish_ready",
  exported: "projects.hub.workflow.exported",
  archived: "projects.hub.workflow.archived",
};

export function HcProjectCardBadges({ project }: Props) {
  const t = useActiveTranslator();
  const projectType = resolveHcProjectLastService(project);
  const workflowStatus = readHcProjectWorkflowStatus(project);
  const typeKey = TYPE_LABEL[projectType] ?? "hcProject.state.unknown";
  const workflowKey = WORKFLOW_LABEL[workflowStatus] ?? "projects.hub.workflow.in_progress";

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="hc-project-card-badges">
      <span className="inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900">
        {t(typeKey as never)}
      </span>
      <span className="inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-900">
        {t(workflowKey as never)}
      </span>
    </div>
  );
}
