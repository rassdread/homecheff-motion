"use client";

import { useEffect, useMemo, useState } from "react";
import { readAssistantEditorContext } from "@/lib/assistant-editor-context-bridge";
import { inferAccessoryTypeFromLabel } from "@/lib/editor-vision-accessories-taxonomy";
import { visionPartDisplayLabelKey } from "@/lib/editor-vision-part-display-label";
import { useActiveTranslator } from "@/i18n/client";
import { useMounted } from "@/hooks/use-mounted";
import type { AssistantEditorContextHint } from "@/types/assistant-v3";

type Props = {
  onSelect: (message: string) => void;
};

export function StudioCopilotQuickActions({ onSelect }: Props) {
  const t = useActiveTranslator();
  const mounted = useMounted();
  const [editorCtx, setEditorCtx] = useState<AssistantEditorContextHint | null>(null);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const sync = () => setEditorCtx(readAssistantEditorContext());
    sync();
    const id = window.setInterval(sync, 1000);
    return () => window.clearInterval(id);
  }, [mounted]);

  const actions = useMemo(() => {
    if (!mounted || !editorCtx) {
      return [
        { id: "help_edit", message: t("studioCopilot.quick.helpEdit" as never) },
        { id: "next_step", message: t("studioCopilot.quick.nextStep" as never) },
      ];
    }

    const part = editorCtx.selectedPartGroup?.toLowerCase() ?? "";
    const partName = editorCtx.selectedPartName ?? "";
    const accessoryType = inferAccessoryTypeFromLabel(partName);
    const isAccessorySelection =
      part === "accessories" || Boolean(visionPartDisplayLabelKey(partName));

    if (isAccessorySelection) {
      if (accessoryType === "sunglasses" || accessoryType === "glasses") {
        return [
          { id: "acc_remove", message: t("studioCopilot.quick.accessory.remove" as never) },
          { id: "acc_color", message: t("studioCopilot.quick.accessory.color" as never) },
          { id: "acc_darker", message: t("studioCopilot.quick.accessory.darkerLens" as never) },
          { id: "acc_bigger", message: t("studioCopilot.quick.accessory.bigger" as never) },
          { id: "acc_smaller", message: t("studioCopilot.quick.accessory.smaller" as never) },
          { id: "acc_aviator", message: t("studioCopilot.quick.accessory.aviator" as never) },
          { id: "acc_modern", message: t("studioCopilot.quick.accessory.modern" as never) },
        ];
      }
      if (accessoryType === "collar") {
        return [
          { id: "acc_color", message: t("studioCopilot.quick.accessory.color" as never) },
          { id: "acc_style", message: t("studioCopilot.quick.accessory.style" as never) },
          { id: "acc_nameplate", message: t("studioCopilot.quick.accessory.nameplate" as never) },
          { id: "acc_remove", message: t("studioCopilot.quick.accessory.remove" as never) },
        ];
      }
      return [
        { id: "acc_color", message: t("studioCopilot.quick.accessory.color" as never) },
        { id: "acc_style", message: t("studioCopilot.quick.accessory.style" as never) },
        { id: "acc_remove", message: t("studioCopilot.quick.accessory.remove" as never) },
      ];
    }

    if (part === "eyes" || /ogen/i.test(partName)) {
      return [
        { id: "eyes_bigger", message: t("studioCopilot.quick.eyesBigger" as never) },
        { id: "eyes_color", message: t("studioCopilot.quick.eyesColor" as never) },
        { id: "expression_happy", message: t("studioCopilot.quick.expressionHappy" as never) },
      ];
    }
    if (part === "outfit" || /outfit/i.test(editorCtx.selectedPartName ?? "")) {
      return [
        { id: "outfit_business", message: t("studioCopilot.quick.outfitBusiness" as never) },
        { id: "outfit_casual", message: t("studioCopilot.quick.outfitCasual" as never) },
        { id: "outfit_chef", message: t("studioCopilot.quick.outfitChef" as never) },
      ];
    }
    if (editorCtx.taxonomyType === "animal" || editorCtx.selectedAssetType === "animal") {
      return [
        { id: "pet_mascot", message: t("studioCopilot.quick.petMascot" as never) },
        { id: "fur_color", message: t("studioCopilot.quick.furColor" as never) },
      ];
    }
    if (/globe\s*man/i.test(editorCtx.selectedAssetName ?? "") || editorCtx.taxonomyType === "mascot") {
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
  }, [editorCtx, mounted, t]);

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
