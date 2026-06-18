"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useActiveTranslator } from "@/i18n/client";
import { readAssistantEditorContext } from "@/lib/assistant-editor-context-bridge";

type Props = {
  compact?: boolean;
};

export function StudioCopilotContextBar({ compact = false }: Props) {
  const t = useActiveTranslator();
  const pathname = usePathname();
  const { snapshot, activeProjectId, memory } = useHomeCheffAssistant();
  const [editorCtx, setEditorCtx] = useState(readAssistantEditorContext());

  useEffect(() => {
    const sync = () => setEditorCtx(readAssistantEditorContext());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("hc-studio-copilot-layout-updated", sync);
    const id = window.setInterval(sync, 1200);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("hc-studio-copilot-layout-updated", sync);
      window.clearInterval(id);
    };
  }, [pathname, memory.v3?.selectedPartName, memory.v3?.selectedAssetName]);

  const activeProject = snapshot.projects.find((p) => p.id === activeProjectId) ?? null;
  const mode = editorCtx?.module ?? (pathname.startsWith("/editor") ? "editor" : pathname.startsWith("/animate") || pathname.startsWith("/motion") ? "motion" : pathname.startsWith("/publish") ? "publish" : "producer");

  const parts: string[] = [];
  if (editorCtx?.selectedAssetName) {
    parts.push(editorCtx.selectedAssetName);
  }
  if (editorCtx?.selectedPartName) {
    parts.push(editorCtx.selectedPartName);
  }
  if (!editorCtx?.selectedAssetName && activeProject) {
    parts.push(activeProject.title);
  }

  const modeLabel = t(`studioCopilot.mode.${mode}` as never);
  const contextLine =
    parts.length > 0
      ? parts.join(" · ")
      : t("studioCopilot.context.empty" as never);

  const readiness = memory.v3?.reasoningProfile === "producer" ? null : null;

  return (
    <div
      className={`border-b border-zinc-100 bg-zinc-50/80 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}
      data-testid="studio-copilot-context-bar"
    >
      <p className={`text-zinc-600 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        <span className="font-semibold text-zinc-800">{modeLabel}</span>
        <span className="mx-1.5 text-zinc-300">·</span>
        <span>{contextLine}</span>
      </p>
      {readiness ? null : null}
    </div>
  );
}
