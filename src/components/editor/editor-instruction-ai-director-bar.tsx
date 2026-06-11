"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { clearChangePlan } from "@/lib/editor-instruction-change-plan";
import {
  parseEditorInstructionRequest,
  parsedRequestToChangePlanEntries,
} from "@/lib/editor-instruction-request-parser";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  editableObjects: EditorInstructionObjectV2[];
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onApplyFirstChange: (objectLabel: string, category: string) => void;
};

export function EditorInstructionAiDirectorBar({
  document,
  editableObjects,
  onDocumentChange,
  onApplyFirstChange,
}: Props) {
  const t = useActiveTranslator();
  const [prompt, setPrompt] = useState(document.instructionStudioState?.directorPrompt ?? "");
  const [parsed, setParsed] = useState<ReturnType<typeof parseEditorInstructionRequest> | null>(
    null
  );

  const analyze = () => {
    const result = parseEditorInstructionRequest(prompt);
    setParsed(result);
    const resolveObjectId = (label: string, category: string) => {
      const match = editableObjects.find(
        (o) =>
          o.label.toLowerCase().includes(label.toLowerCase()) ||
          label.toLowerCase().includes(o.label.toLowerCase()) ||
          o.category === category
      );
      return match?.id ?? `obj_${label.toLowerCase().replace(/\s+/g, "_")}`;
    };
    const items = parsedRequestToChangePlanEntries(result, resolveObjectId);
    const nextDoc: EditorCanvasDocument = {
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        directorPrompt: prompt,
        outputTarget: result.outputTarget,
        changePlan: items,
      },
      updatedAt: new Date().toISOString(),
    };
    onDocumentChange(nextDoc);
    const first = result.objects[0];
    if (first) {
      onApplyFirstChange(first.object, first.objectCategory);
    }
  };

  const resetPlan = () => {
    setParsed(null);
    onDocumentChange(
      clearChangePlan({
        ...document,
        instructionStudioState: { ...document.instructionStudioState, directorPrompt: prompt },
      })
    );
  };

  return (
    <section className={`px-4 py-3 ${studioVisual.editorSurface}`} data-testid="instruction-ai-director">
      <h2 className="text-sm font-semibold text-violet-900">
        {t("editor.instructionStudio.v2.director.title" as never)}
      </h2>
      <textarea
        className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("editor.instructionStudio.v2.director.placeholder" as never)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={analyze}
        >
          {t("editor.instructionStudio.v2.director.analyze" as never)}
        </button>
        {parsed ?
          <button type="button" className="text-xs text-violet-800 underline" onClick={resetPlan}>
            {t("editor.instructionStudio.v2.director.reset" as never)}
          </button>
        : null}
      </div>
      {parsed && (parsed.objects.length > 0 || parsed.styleChanges.length > 0) ?
        <ul className="mt-3 space-y-1 text-xs text-violet-900">
          {parsed.objects.map((obj) => (
            <li key={obj.object}>
              <span className="font-semibold">{obj.object}</span>
              {obj.actions.map((a) => (
                <span key={a.action} className="ml-2 text-violet-700">
                  → {a.action}
                  {a.color ? ` (${a.color})` : ""}
                  {a.replacement ? ` → ${a.replacement}` : ""}
                </span>
              ))}
            </li>
          ))}
          {parsed.styleChanges.map((style) => (
            <li key={`${style.styleAttribute}-${style.actionId}`}>
              <span className="font-semibold">{style.styleAttribute.replace(/_/g, " ")}</span>
              <span className="ml-2 text-violet-700">→ {style.instruction}</span>
            </li>
          ))}
        </ul>
      : null}
      {parsed?.outputTarget ?
        <p className="mt-2 text-xs text-violet-800">
          {t("editor.instructionStudio.v2.director.outputTarget" as never)}: {parsed.outputTarget}
        </p>
      : null}
      {parsed?.suggestions.length ?
        <ul className="mt-2 space-y-1 text-[11px] text-violet-700">
          {parsed.suggestions.map((key) => (
            <li key={key}>• {t(key as never)}</li>
          ))}
        </ul>
      : null}
    </section>
  );
}
