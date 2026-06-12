"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { downloadHcProjectFile } from "@/lib/homecheff-project-package-core";
import { downloadMotionFrameUrlsZip } from "@/lib/motion-frame-download";
import { MotionDurationGuide } from "@/components/motion/motion-duration-guide";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { HomeCheffProjectFileActions } from "@/components/projects/homecheff-project-file-actions";
import { useActiveTranslator } from "@/i18n/client";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  motionGenerationPackageFromHc,
  resolveMotionNextBestActions,
} from "@/lib/motion-next-best-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  projectId: string;
  videoUrl?: string;
  hcProjectId?: string;
  editorSessionId?: string;
  document?: EditorCanvasDocument;
  frameUrls?: string[];
};

export function MotionPostGenerationActionCenter({
  projectId,
  videoUrl,
  hcProjectId,
  editorSessionId,
  document,
  frameUrls,
}: Props) {
  const t = useActiveTranslator();
  const [busyId, setBusyId] = useState<string | null>(null);
  const hcProject = hcProjectId ? loadHomeCheffProject(hcProjectId) : null;
  const pkg = motionGenerationPackageFromHc(hcProject);

  const runAction = async (actionId: string) => {
    setBusyId(actionId);
    try {
      if (actionId === "download_frames" && frameUrls?.length) {
        await downloadMotionFrameUrlsZip(frameUrls, `motion-${projectId}`);
      }
      if (actionId === "export_hc" && hcProject) {
        downloadHcProjectFile(hcProject);
      }
    } finally {
      setBusyId(null);
    }
  };

  const actions = useMemo(
    () =>
      resolveMotionNextBestActions({
        projectId,
        videoUrl,
        hcProjectId,
        editorSessionId,
        document,
        frameUrls,
      }),
    [document, editorSessionId, frameUrls, hcProjectId, projectId, videoUrl]
  );

  return (
    <section
      className={`space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 ${studioVisual.editorSurface}`}
      data-testid="motion-post-generation-action-center"
    >
      <div>
        <h2 className="text-sm font-bold text-zinc-900">{t("motion.postGen.title" as never)}</h2>
        <p className="mt-1 text-xs text-zinc-600">{t("motion.postGen.lead" as never)}</p>
      </div>
      {hcProject ?
        <HcProjectStateBadge project={hcProject} compact />
      : null}
      {document && hcProject ?
        <HomeCheffProjectFileActions document={document} compact />
      : null}
      {pkg ?
        <p className="text-xs text-zinc-500">
          {t("platform.generationPackage.label" as never)}: {pkg.id}
        </p>
      : null}
      <MotionDurationGuide />
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) =>
          action.href ?
            <Link
              key={action.id}
              href={action.href}
              download={action.external ? true : undefined}
              className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-semibold text-zinc-900 transition hover:border-[#0067B1]/40"
            >
              {t(action.labelKey as never)}
            </Link>
          : (
            <button
              key={action.id}
              type="button"
              disabled={busyId === action.id}
              onClick={() => void runAction(action.id)}
              className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              {busyId === action.id ? t("button.loading") : t(action.labelKey as never)}
            </button>
          )
        )}
      </div>
    </section>
  );
}
