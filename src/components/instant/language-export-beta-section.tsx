"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  isPublicDebugUiEnabled,
  shouldShowLanguageExportAdminDebug,
} from "@/lib/debug-ui";
import type { VideoLanguageExportSummary } from "@/types/animation-api";
import { LanguageExportPanel } from "@/components/instant/language-export-panel";

type Props = {
  projectId: string;
  hasCompletedFinal: boolean;
  languageExports: VideoLanguageExportSummary[];
  onLanguageExportsChange: (exports: VideoLanguageExportSummary[]) => void;
  onRenderCompleted?: (languageCode: string, exportId: string) => void;
  isAdmin?: boolean;
  adminDebugExpanded?: boolean;
  onAdminDebugExpandedChange?: (open: boolean) => void;
};

export function LanguageExportBetaSection({
  projectId,
  hasCompletedFinal,
  languageExports,
  onLanguageExportsChange,
  onRenderCompleted,
  isAdmin = false,
  adminDebugExpanded = false,
  onAdminDebugExpandedChange,
}: Props) {
  const t = useActiveTranslator();
  const [expanded, setExpanded] = useState(false);
  const showAdminDebug = shouldShowLanguageExportAdminDebug(isAdmin, adminDebugExpanded);

  if (!hasCompletedFinal) {
    return null;
  }

  if (!expanded) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
        >
          {t("instant.languageExport.betaToggle")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-zinc-800">
            {t("instant.languageExport.betaPanelTitle")}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">{t("instant.languageExport.betaNote")}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
        >
          {t("instant.languageExport.betaCollapse")}
        </button>
      </div>

      <div className="px-3 py-3">
        {isAdmin && !isPublicDebugUiEnabled() && onAdminDebugExpandedChange ? (
          <button
            type="button"
            onClick={() => onAdminDebugExpandedChange(!adminDebugExpanded)}
            className="mb-2 text-[10px] font-medium text-zinc-500 underline hover:text-zinc-700"
          >
            {adminDebugExpanded
              ? t("instant.languageExport.hideAdminDebug")
              : t("instant.languageExport.showAdminDebug")}
          </button>
        ) : null}

        <LanguageExportPanel
          projectId={projectId}
          hasCompletedFinal={hasCompletedFinal}
          languageExports={languageExports}
          onLanguageExportsChange={onLanguageExportsChange}
          onRenderCompleted={onRenderCompleted}
          showAdminDebug={showAdminDebug}
        />
      </div>
    </div>
  );
}
