"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { clearEditorDirectorPlan, applyEditorDirectorPrompt } from "@/lib/editor-instruction-director-actions";
import { parseEditorInstructionRequest } from "@/lib/editor-instruction-request-parser";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { resolveDirectorPlaceholderKey, resolveDirectorSuggestionKeys } from "@/lib/editor-personalized-recommendations";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  editableObjects: EditorInstructionObjectV2[];
  isAdmin?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onApplyFirstChange: (objectLabel: string, category: string) => void;
};

export function EditorInstructionAiDirectorBar({
  document,
  editableObjects,
  isAdmin = false,
  onDocumentChange,
  onApplyFirstChange,
}: Props) {
  const t = useActiveTranslator();
  const [prompt, setPrompt] = useState(document.instructionStudioState?.directorPrompt ?? "");
  const [parsed, setParsed] = useState<ReturnType<typeof parseEditorInstructionRequest> | null>(
    null
  );

  const recCtx = useMemo(
    () => buildEditorRecommendationContext({ document, isAdmin }),
    [document, isAdmin]
  );
  const directorPlaceholderKey = useMemo(
    () => resolveDirectorPlaceholderKey(recCtx),
    [recCtx]
  );
  const suggestionKeys = useMemo(() => {
    if (!parsed) {
      return [];
    }
    return resolveDirectorSuggestionKeys({
      ctx: recCtx,
      hasClothing: parsed.objects.some((o) => o.objectCategory === "clothing"),
      promptLower: parsed.rawPrompt.toLowerCase(),
    });
  }, [parsed, recCtx]);

  const analyze = () => {
    const applied = applyEditorDirectorPrompt({
      document,
      prompt,
      editableObjects,
      isAdmin,
    });
    setParsed(applied.parsed);
    onDocumentChange(applied.document);
    if (applied.firstObjectLabel && applied.firstObjectCategory) {
      onApplyFirstChange(applied.firstObjectLabel, applied.firstObjectCategory);
    }
  };

  const resetPlan = () => {
    setParsed(null);
    onDocumentChange(clearEditorDirectorPlan(document, prompt));
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
        placeholder={t(directorPlaceholderKey as never)}
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
      {suggestionKeys.length ?
        <ul className="mt-2 space-y-1 text-[11px] text-violet-700" data-testid="director-suggestions">
          {suggestionKeys.map((key) => (
            <li key={key}>• {t(key as never)}</li>
          ))}
        </ul>
      : null}
    </section>
  );
}
