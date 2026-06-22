"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fusionCategoryOutputFields } from "@/lib/editor-fusion-archetypes";
import { patchFusionPlan, setFusionStrength } from "@/lib/editor-fusion-plan";
import { patchFusionGenerationSettings } from "@/lib/editor-fusion-generation-settings";
import { getFusionPlan } from "@/lib/editor-fusion-plan";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  customPrompt?: string;
  onCustomPromptChange?: (value: string) => void;
};

export function EditorFusionWizardAdvancedSettings({
  document,
  onDocumentChange,
  customPrompt,
  onCustomPromptChange,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);
  const plan = getFusionPlan(document);
  const intent = plan?.intent ?? document.instructionStudioState?.combineIntent;

  if (!plan || !intent) {
    return null;
  }

  const categoryFields = fusionCategoryOutputFields(intent);

  const patchCategoryOutput = (key: string, value: boolean | string) => {
    const updatedPlan = patchFusionGenerationSettings(plan, { [key]: value });
    onDocumentChange(patchFusionPlan(document, updatedPlan));
  };

  return (
    <section
      className={`rounded-xl border border-zinc-200 ${studioVisual.editorSurface}`}
      data-testid="fusion-wizard-advanced-settings"
      data-collapsed={open ? "false" : "true"}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-zinc-900">
          {t("editor.fusionWizard.advancedSettings" as never)}
        </span>
        <span className="text-xs text-zinc-500">{open ? "−" : "+"}</span>
      </button>

      {open ?
        <div className="space-y-4 border-t border-zinc-100 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("editor.fusion.setup.fusionStrength" as never)}: {plan.fusionStrength}%
            </p>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={plan.fusionStrength}
              onChange={(e) =>
                onDocumentChange(setFusionStrength(document, Number(e.target.value)))
              }
              className="mt-2 w-full"
              data-testid="fusion-wizard-blend-strength"
            />
          </div>

          {categoryFields.length > 0 ?
            <div className="space-y-3">
              {categoryFields.map((field) => {
                const value = plan.generationSettings[field.key] ?? field.defaultValue;
                if (field.type === "boolean") {
                  return (
                    <label key={field.key} className="flex items-center gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(e) => patchCategoryOutput(field.key, e.target.checked)}
                      />
                      {t(field.labelKey as never)}
                    </label>
                  );
                }
                if (field.type === "choice" && field.choices?.length) {
                  return (
                    <label key={field.key} className="block text-sm text-zinc-800">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t(field.labelKey as never)}
                      </span>
                      <select
                        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                        value={String(value ?? field.defaultValue ?? field.choices[0])}
                        onChange={(e) => patchCategoryOutput(field.key, e.target.value)}
                      >
                        {field.choices.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                return null;
              })}
            </div>
          : null}

          {onCustomPromptChange ?
            <label className="block text-sm text-zinc-800">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("editor.fusionWizard.customPrompt" as never)}
              </span>
              <textarea
                value={customPrompt ?? ""}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder={t("editor.fusionWizard.customPromptPlaceholder" as never)}
              />
            </label>
          : null}
        </div>
      : null}
    </section>
  );
}
