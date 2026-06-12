"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { HcProjectStateBadge } from "@/components/projects/hc-project-state-badge";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { exportEditorDocumentAsHcProject } from "@/lib/homecheff-project-export";
import { extendAndPersistHcHandoff } from "@/lib/homecheff-project-handoff-routes";
import { importHomeCheffProjectFile } from "@/lib/homecheff-project-import";
import { buildHcHandoffUrl, resolveHcProjectOpenTargets } from "@/lib/homecheff-project-package-core";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { HomeCheffShareMode } from "@/types/homecheff-project-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document?: EditorCanvasDocument;
  compact?: boolean;
};

export function HomeCheffProjectFileActions({ document, compact = false }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const auth = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const hcProject = document?.instructionStudioState?.hcProjectId
    ? loadHomeCheffProject(document.instructionStudioState.hcProjectId)
    : null;

  const exportProject = (shareMode: HomeCheffShareMode = "private_backup") => {
    if (!document) return;
    exportEditorDocumentAsHcProject({
      document,
      shareMode,
      ownerId: auth.user?.id,
      syncToServer: Boolean(auth.user),
    });
    setStatus("hcProject.export.success");
  };

  const importProject = async (file: File) => {
    const content = await file.text();
    const result = await importHomeCheffProjectFile({
      content,
      userId: auth.user?.id,
      syncToServer: Boolean(auth.user),
    });
    if (!result.ok) {
      setStatus("hcProject.import.failed");
      return;
    }
    setStatus(result.copied ? "hcProject.import.copied" : "hcProject.import.success");
    const targets = resolveHcProjectOpenTargets(result.project);
    router.push(buildHcHandoffUrl(result.project.id, targets[0] ?? "editor"));
  };

  const handoff = (target: "motion" | "publish" | "studio", durationSec?: number) => {
    if (!document) return;
    const { href } = extendAndPersistHcHandoff({
      document,
      target,
      durationSec,
      syncToServer: Boolean(auth.user),
    });
    router.push(href);
  };

  return (
    <div
      className={compact ? "space-y-2" : `space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 ${studioVisual.editorSurface}`}
      data-testid="hc-project-actions"
    >
      {!compact ?
        <>
          <h3 className="text-sm font-bold text-zinc-900">{t("hcProject.title" as never)}</h3>
          <p className="text-xs text-zinc-600">{t("hcProject.lead" as never)}</p>
          <p className="text-xs text-zinc-500">{t("hcProject.cloudNote" as never)}</p>
        </>
      : null}
      {hcProject ? <HcProjectStateBadge project={hcProject} compact /> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={studioVisual.btnOutline} onClick={() => exportProject("editable_copy")}>
          {t("hcProject.export" as never)}
        </button>
        <button type="button" className={studioVisual.btnOutline} onClick={() => fileInputRef.current?.click()}>
          {t("hcProject.import" as never)}
        </button>
        {document ?
          <>
            <button type="button" className={studioVisual.btnOutline} onClick={() => handoff("studio")}>
              {t("hcProject.useStudio" as never)}
            </button>
            <button type="button" className={studioVisual.btnOutline} onClick={() => handoff("motion", 5)}>
              {t("hcProject.useMotion" as never)}
            </button>
            <button type="button" className={studioVisual.btnOutline} onClick={() => handoff("publish")}>
              {t("hcProject.usePublish" as never)}
            </button>
          </>
        : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".hc,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importProject(file);
        }}
      />
      {status ?
        <p className="text-xs text-emerald-800">{t(status as never)}</p>
      : null}
    </div>
  );
}
