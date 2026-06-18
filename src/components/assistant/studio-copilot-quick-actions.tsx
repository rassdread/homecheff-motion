"use client";

import { useEffect, useMemo, useState } from "react";
import { readAssistantEditorContext } from "@/lib/assistant-editor-context-bridge";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  onSelect: (message: string) => void;
};

export function StudioCopilotQuickActions({ onSelect }: Props) {
  const t = useActiveTranslator();
  const [editorCtx, setEditorCtx] = useState(readAssistantEditorContext());

  useEffect(() => {
    const sync = () => setEditorCtx(readAssistantEditorContext());
    sync();
    const id = window.setInterval(sync, 1000);
    return () => window.clearInterval(id);
  }, []);

  const actions = useMemo(() => {
    const part = editorCtx?.selectedPartGroup?.toLowerCase() ?? "";
    const asset = editorCtx?.selectedAssetName ?? "";
    if (part === "eyes" || /ogen/i.test(editorCtx?.selectedPartName ?? "")) {
      return [
        { id: "eyes_bigger", message: t("studioCopilot.quick.eyesBigger" as never) },
        { id: "eyes_color", message: t("studioCopilot.quick.eyesColor" as never) },
        { id: "expression_happy", message: t("studioCopilot.quick.expressionHappy" as never) },
      ];
    }
    if (part === "outfit" || /outfit/i.test(editorCtx?.selectedPartName ?? "")) {
      return [
        { id: "outfit_business", message: t("studioCopilot.quick.outfitBusiness" as never) },
        { id: "outfit_casual", message: t("studioCopilot.quick.outfitCasual" as never) },
        { id: "outfit_chef", message: t("studioCopilot.quick.outfitChef" as never) },
      ];
    }
    if (editorCtx?.taxonomyType === "animal" || editorCtx?.selectedAssetType === "animal") {
      return [
        { id: "pet_mascot", message: t("studioCopilot.quick.petMascot" as never) },
        { id: "fur_color", message: t("studioCopilot.quick.furColor" as never) },
      ];
    }
    if (/globe\s*man/i.test(asset) || editorCtx?.taxonomyType === "mascot") {
      return [
        { id: "eyes_bigger", message: t("studioCopilot.quick.eyesBigger" as never) },
        { id: "outfit_business", message: t("studioCopilot.quick.outfitBusiness" as never) },
        { id: "expression_happy", message: t("studioCopilot.quick.expressionHappy" as never) },
        { id: "preserve_globe", message: t("studioCopilot.quick.preserveGlobe" as never) },
      ];
    }
    return [
      { id: "help_edit", message: t("studioCopilot.quick.helpEdit" as never) },
      { id: "next_step", message: t("studioCopilot.quick.nextStep" as never) },
    ];
  }, [editorCtx, t]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="studio-copilot-quick-actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-900 hover:border-violet-300"
          onClick={() => onSelect(action.message)}
        >
          {action.message}
        </button>
      ))}
    </div>
  );
}
