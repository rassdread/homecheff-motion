"use client";

import { defaultLifeTimelineAges } from "@/lib/editor-generation-cost";
import { patchFusionPlan } from "@/lib/editor-fusion-plan";
import { patchFusionGenerationSettings } from "@/lib/editor-fusion-generation-settings";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorFusionLifeTimelinePanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const plan = document.instructionStudioState?.fusionPlan;
  if (!plan || plan.intent !== "life_timeline") {
    return null;
  }

  const selectedAges = Array.isArray(plan.generationSettings.selectedAges)
    ? (plan.generationSettings.selectedAges as number[])
    : defaultLifeTimelineAges();
  const customAge =
    typeof plan.generationSettings.customAge === "number"
      ? plan.generationSettings.customAge
      : "";

  const toggleAge = (age: number) => {
    const nextAges = selectedAges.includes(age)
      ? selectedAges.filter((value) => value !== age)
      : [...selectedAges, age].sort((a, b) => a - b);
    onDocumentChange(
      patchFusionPlan(document, patchFusionGenerationSettings(plan, { selectedAges: nextAges }))
    );
  };

  return (
    <section className={`space-y-3 p-4 ${studioVisual.editorSurface}`} data-testid="editor-fusion-life-timeline">
      <div>
        <h3 className="text-sm font-bold text-zinc-900">
          {t("editor.generation.lifeTimeline.title" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          {t("editor.generation.lifeTimeline.lead" as never)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {defaultLifeTimelineAges().map((age) => (
          <label
            key={age}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              selectedAges.includes(age) ? "border-[#0067B1] bg-[#0067B1]/10" : "border-zinc-200"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedAges.includes(age)}
              onChange={() => toggleAge(age)}
            />
            {age}
          </label>
        ))}
      </div>
      <label className="block text-xs text-zinc-600">
        {t("editor.generation.lifeTimeline.customAge" as never)}
        <input
          type="number"
          min={18}
          max={100}
          value={customAge}
          onChange={(event) => {
            const value = Number(event.target.value);
            const nextPlan = patchFusionGenerationSettings(plan, {
              customAge: Number.isFinite(value) ? value : undefined,
            });
            if (Number.isFinite(value) && value >= 18) {
              const ages = [...selectedAges.filter((age) => !defaultLifeTimelineAges().includes(age as never)), value].sort(
                (a, b) => a - b
              );
              onDocumentChange(
                patchFusionPlan(document, patchFusionGenerationSettings(nextPlan, { selectedAges: ages }))
              );
              return;
            }
            onDocumentChange(patchFusionPlan(document, nextPlan));
          }}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      <p className="text-xs text-zinc-500">
        {t("editor.generation.lifeTimeline.selectedCount" as never, {
          count: Math.max(selectedAges.length, 1),
        } as never)}
      </p>
    </section>
  );
}
