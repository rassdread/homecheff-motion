"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fusionCategoryOutputFields } from "@/lib/editor-fusion-archetypes";
import { patchFusionGenerationSettings } from "@/lib/editor-fusion-generation-settings";
import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import {
  activePreservationRules,
  patchFusionPlan,
  setFusionPreservationStrength,
  setFusionStrength,
  toggleFusionPreservation,
  toggleInheritedTrait,
} from "@/lib/editor-fusion-plan";
import { EDITOR_FUSION_PRESERVATION_STRENGTHS } from "@/types/editor-instruction-studio";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorFusionPreservationRule } from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

const OUTFIT_PRESERVATION: EditorFusionPreservationRule[] = [
  "face",
  "body",
  "pose",
  "identity",
  "hairstyle",
];

export function EditorFusionSetupPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const plan = document.instructionStudioState?.fusionPlan;
  const intent = plan?.intent ?? document.instructionStudioState?.combineIntent;

  const def = useMemo(
    () => (intent ? fusionIntentDefinition(intent) : null),
    [intent]
  );

  if (!plan || !def) {
    return null;
  }

  const preservationOptions =
    def.id === "outfit_from_reference" || def.id === "person_outfit"
      ? OUTFIT_PRESERVATION
      : def.defaultPreservation;

  const categoryFields = fusionCategoryOutputFields(plan.intent);

  const patchCategoryOutput = (key: string, value: boolean | string) => {
    const updatedPlan = patchFusionGenerationSettings(plan, { [key]: value });
    onDocumentChange(patchFusionPlan(document, updatedPlan));
  };

  return (
    <section
      className={`space-y-4 p-4 ${studioVisual.editorSurface}`}
      data-testid="editor-fusion-setup-panel"
    >
      <div>
        <h3 className="text-sm font-bold text-zinc-900">
          {t("editor.fusion.setup.title" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">{t("editor.fusion.setup.lead" as never)}</p>
      </div>

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
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {categoryFields.length > 0 ?
        <div data-testid="editor-fusion-category-output">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.fusion.setup.categoryOutput" as never)}
          </p>
          <div className="mt-2 space-y-3">
            {categoryFields.map((field) => {
              const value = plan.generationSettings[field.key] ?? field.defaultValue;
              if (field.type === "boolean") {
                return (
                  <label
                    key={field.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={value === true}
                      onChange={(e) => patchCategoryOutput(field.key, e.target.checked)}
                    />
                    {t(field.labelKey as never)}
                  </label>
                );
              }
              return (
                <div key={field.key}>
                  <p className="text-xs font-medium text-zinc-600">{t(field.labelKey as never)}</p>
                  <select
                    value={String(value)}
                    onChange={(e) => patchCategoryOutput(field.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {(field.choices ?? []).map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      : null}

      {preservationOptions.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.fusion.setup.preservation" as never)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {preservationOptions.map((rule) => {
              const enabled = plan.preservation.toggles[rule] !== false;
              return (
                <label
                  key={rule}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                    enabled ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-zinc-300 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                      onDocumentChange(toggleFusionPreservation(document, rule, e.target.checked))
                    }
                    className="sr-only"
                  />
                  {t(`editor.fusion.preservation.${rule}` as never)}
                </label>
              );
            })}
          </div>
        </div>
      : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("editor.fusion.setup.preservationStrength" as never)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EDITOR_FUSION_PRESERVATION_STRENGTHS.map((strength) => (
            <button
              key={strength}
              type="button"
              onClick={() => onDocumentChange(setFusionPreservationStrength(document, strength))}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                plan.preservation.strength === strength
                  ? "bg-[#0067B1] text-white"
                  : "border border-zinc-300 bg-white text-zinc-800"
              }`}
            >
              {t(`editor.fusion.preservationStrength.${strength}` as never)}
            </button>
          ))}
        </div>
      </div>

      {plan.inheritedTraits.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.fusion.setup.inheritedTraits" as never)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.inheritedTraits.map((trait) => (
              <label
                key={trait.id}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                  trait.enabled ? "border-violet-400 bg-violet-50 text-violet-900" : "border-zinc-300 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={trait.enabled}
                  onChange={(e) =>
                    onDocumentChange(toggleInheritedTrait(document, trait.id, e.target.checked))
                  }
                  className="sr-only"
                />
                {trait.label}
              </label>
            ))}
          </div>
        </div>
      : null}

      {plan.simulationDisclaimer ?
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("editor.fusion.simulationNotice" as never)}
        </p>
      : null}

      <p className="text-[11px] text-zinc-500">
        {t("editor.fusion.setup.activePreservation" as never)}:{" "}
        {activePreservationRules(plan).join(", ") || "—"}
      </p>
    </section>
  );
}
