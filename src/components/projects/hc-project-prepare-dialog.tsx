"use client";

import { useState } from "react";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import {
  prepareHcProjectForService,
  resolveHcProjectServiceReadiness,
} from "@/lib/homecheff-project-prepare";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { HomeCheffProjectPackage, HomeCheffProjectType } from "@/types/homecheff-project-package";

type Props = {
  projectId: string;
  target: HomeCheffProjectType;
  onClose: () => void;
  onReady: (href: string) => void;
};

export function HcProjectPrepareDialog({ projectId, target, onClose, onReady }: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const project = loadHomeCheffProject(projectId);

  if (!project) {
    return null;
  }

  const readiness = resolveHcProjectServiceReadiness(project, target);

  const handlePrepare = async () => {
    setBusy(true);
    const current = loadHomeCheffProject(projectId);
    if (!current) {
      setBusy(false);
      return;
    }
    prepareHcProjectForService(current, target);
    setBusy(false);
    onReady(buildHcHandoffUrl(projectId, target));
  };

  if (busy) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#041428]/90 backdrop-blur-md">
        <HomeCheffOrbitLoader state="hydrating" size="lg" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      data-testid="hc-project-prepare-dialog"
    >
      <div className={`w-full max-w-md p-5 ${studioVisual.hubCard}`}>
        <h2 className="text-lg font-bold text-zinc-900">{project.title}</h2>
        <p className="mt-2 text-sm text-zinc-600">
          {readiness.ready
            ? t("hcPrepare.ready" as never, { service: target } as never)
            : t("hcPrepare.notPrepared" as never, { service: target } as never)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{t("hcPrepare.summary" as never)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {readiness.ready ?
            <button
              type="button"
              className={`min-h-11 ${studioVisual.btnGradientPrimary}`}
              onClick={() => onReady(buildHcHandoffUrl(projectId, target))}
            >
              {t("hcPrepare.open" as never, { service: target } as never)}
            </button>
          : (
            <button type="button" className={`min-h-11 ${studioVisual.btnGradientPrimary}`} onClick={() => void handlePrepare()}>
              {t("hcPrepare.prepare" as never, { service: target } as never)}
            </button>
          )}
          <button type="button" className={`min-h-11 ${studioVisual.editorTabInactive}`} onClick={onClose}>
            {t("editor.flow.back" as never)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function summarizeHcProjectForPrepare(project: HomeCheffProjectPackage): string {
  const parts: string[] = [];
  if (project.servicePayload.editor) parts.push("editor");
  if (project.servicePayload.motion) parts.push("motion");
  if (project.servicePayload.publish) parts.push("publish");
  if (project.servicePayload.studio) parts.push("studio");
  return parts.join(" · ");
}
