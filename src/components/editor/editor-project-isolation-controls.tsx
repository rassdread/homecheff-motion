"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { clearAllEditorProjectIsolationState } from "@/lib/editor-project-isolation";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import { resolvePremiumVisionAnalysisGate } from "@/lib/editor-vision-analysis-tier";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  /** Preferred: shared hook entry for premium deep-analyze. */
  onRunPremiumAnalysis?: () => Promise<unknown>;
  /** Called before navigating away for a fresh project. */
  onNewProject?: () => void;
  isAdmin?: boolean;
  userId?: string | null;
  compact?: boolean;
  className?: string;
};

export function EditorProjectIsolationControls({
  document,
  onDocumentChange: _onDocumentChange,
  onRunPremiumAnalysis,
  onNewProject,
  isAdmin = false,
  userId = null,
  compact = false,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const wallet = useStudioWalletSummary(Boolean(userId));
  const premiumGate = resolvePremiumVisionAnalysisGate({
    isAdmin,
    creditsAvailable: wallet.availableCredits,
  });

  const handleNewProject = () => {
    clearAllEditorProjectIsolationState(document.sessionId, document.instructionStudioState?.hcProjectId);
    if (onNewProject) {
      onNewProject();
      return;
    }
    router.push("/editor/start");
  };

  const handlePremiumAnalyze = async () => {
    if (!premiumGate.allowed || !onRunPremiumAnalysis) {
      return;
    }
    setBusy(true);
    try {
      await onRunPremiumAnalysis();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={handleNewProject}
        className={`rounded-full border border-zinc-200 bg-white font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60 ${
          compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
        }`}
        title={t("editor.isolation.newProjectHint" as never)}
      >
        {t("editor.isolation.newProject" as never)}
      </button>
      {onRunPremiumAnalysis ? (
        <button
          type="button"
          disabled={busy || !document.backgroundUrl?.trim() || !premiumGate.allowed}
          onClick={() => void handlePremiumAnalyze()}
          className={`rounded-full border border-violet-200 bg-violet-50 font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60 ${
            compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
          }`}
          title={t("editor.visionAnalysis.premiumAnalyzeHintWithCredits" as never, { count: 5 })}
          data-testid="editor-isolation-premium-analyze-button"
        >
          {busy
            ? t("editor.visionAnalysis.premiumAnalyzeInProgress" as never)
            : t("editor.visionAnalysis.premiumAnalyzeWithCredits" as never, { count: 5 })}
        </button>
      ) : null}
    </div>
  );
}
