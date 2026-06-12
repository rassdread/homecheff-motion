"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { useActiveTranslator } from "@/i18n/client";
import {
  WORKSPACE_SERVICE_LABEL_KEYS,
  workspaceVisual,
  type HomeCheffWorkspaceService,
} from "@/lib/homecheff-workspace-tokens";
import { resolveSuiteBreadcrumbHref, resolveSuiteBreadcrumbLabelKey } from "@/lib/suite-flow-handoffs";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

type Props = {
  service: HomeCheffWorkspaceService;
  projectTitle?: string;
  hcProject?: HomeCheffProjectPackage | null;
  workflowStatus?: string;
  breadcrumbs?: HomeCheffProductId[];
  actions?: ReactNode;
};

export function HomeCheffWorkspaceTopBar({
  service,
  projectTitle,
  hcProject,
  workflowStatus,
  breadcrumbs,
  actions,
}: Props) {
  const t = useActiveTranslator();
  const trail = breadcrumbs ?? [service === "publish" ? "presentation" : service === "library" ? "assets" : service].filter(
    (id): id is HomeCheffProductId => id !== "projects"
  );

  return (
    <header className={workspaceVisual.topBar} data-testid="homecheff-workspace-top-bar">
      <div className={workspaceVisual.topBarInner}>
        <div className="min-w-0 flex-1 space-y-1">
          <nav className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
            {trail.map((productId, index) => (
              <span key={productId} className="inline-flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                <Link
                  href={resolveSuiteBreadcrumbHref(productId)}
                  className="transition-colors hover:text-white/80"
                >
                  {t(resolveSuiteBreadcrumbLabelKey(productId) as never)}
                </Link>
              </span>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <span className={workspaceVisual.serviceBadge}>
              {t(WORKSPACE_SERVICE_LABEL_KEYS[service] as never)}
            </span>
            {projectTitle ?
              <h1 className="truncate text-sm font-bold text-white sm:text-base">{projectTitle}</h1>
            : null}
          </div>
          {workflowStatus ?
            <p className="text-xs text-emerald-300/90">{workflowStatus}</p>
          : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hcProject ?
            <HcProjectStateBadge project={hcProject} compact />
          : null}
          {actions}
        </div>
      </div>
    </header>
  );
}
