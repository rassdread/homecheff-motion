"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { StudioCopilotDock } from "@/components/assistant/studio-copilot-dock";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { applyEditorDirectorPrompt } from "@/lib/editor-instruction-director-actions";
import { defaultSelectionForObject } from "@/lib/editor-instruction-object-v2";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { shouldShowCopilotDock } from "@/lib/studio-copilot-layout-storage";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  isAdmin?: boolean;
};

/** Renders the docked Studio Copilot when placement=dock on an editor canvas route. */
export function EditorCopilotDockSlot({ document, onDocumentChange, isAdmin = false }: Props) {
  const pathname = usePathname();
  const { copilotLayout } = useHomeCheffAssistant();
  const showCopilotDock = shouldShowCopilotDock(copilotLayout, pathname);

  const editableObjects = useMemo(() => listInstructionObjectsV2(document), [document]);

  if (!showCopilotDock) {
    return null;
  }

  return (
    <div className="mb-4" data-testid="editor-copilot-dock-slot">
      <StudioCopilotDock
        onApplyChangePlan={(prompt) => {
          const applied = applyEditorDirectorPrompt({
            document,
            prompt,
            editableObjects,
            isAdmin,
          });
          onDocumentChange(applied.document);
          if (applied.firstObjectLabel && applied.firstObjectCategory) {
            const obj = editableObjects.find(
              (o) =>
                o.label.toLowerCase().includes(applied.firstObjectLabel!.toLowerCase()) ||
                o.category === applied.firstObjectCategory
            );
            if (obj) {
              onDocumentChange({
                ...applied.document,
                instructionStudioState: {
                  ...applied.document.instructionStudioState,
                  selection: defaultSelectionForObject(obj),
                },
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }}
      />
    </div>
  );
}
