"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { FusionArchetypeQuestion, FusionOutfitItem } from "@/lib/editor-fusion-archetype-types";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  questions: FusionArchetypeQuestion[];
  answers: Record<string, string | boolean | string[]>;
  outfitItems?: FusionOutfitItem[];
  onAnswersChange: (answers: Record<string, string | boolean | string[]>) => void;
  onOutfitItemsChange?: (items: FusionOutfitItem[]) => void;
  supportsOutfitItems?: boolean;
};

export function EditorFusionDynamicQuestionsPanel({
  questions,
  answers,
  outfitItems = [],
  onAnswersChange,
  onOutfitItemsChange,
  supportsOutfitItems,
}: Props) {
  const t = useActiveTranslator();

  const setAnswer = (id: string, value: string | boolean | string[]) => {
    onAnswersChange({ ...answers, [id]: value });
  };

  const toggleMulti = (id: string, choice: string) => {
    const current = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    const next = current.includes(choice)
      ? current.filter((v) => v !== choice)
      : [...current, choice];
    setAnswer(id, next);
  };

  const addOutfitItem = () => {
    if (!onOutfitItemsChange) {
      return;
    }
    onOutfitItemsChange([
      ...outfitItems,
      { id: `outfit_${Date.now()}`, type: "shirt", description: "" },
    ]);
  };

  return (
    <section className="space-y-4" data-testid="editor-fusion-dynamic-questions">
      <div>
        <h2 className="text-lg font-bold text-white">{t("editor.fusion.questions.title" as never)}</h2>
        <p className="mt-1 text-sm text-white/80">{t("editor.fusion.questions.lead" as never)}</p>
      </div>

      {questions.map((question) => (
        <div
          key={question.id}
          className={`rounded-2xl border p-4 ${studioVisual.editorSurface} border-zinc-200`}
        >
          <p className="text-sm font-semibold text-zinc-900">{t(question.labelKey as never)}</p>

          {question.type === "boolean" ?
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={answers[question.id] === true}
                onChange={(e) => setAnswer(question.id, e.target.checked)}
              />
              {t("editor.fusion.questions.enabled" as never)}
            </label>
          : null}

          {question.type === "choice" && question.choices ?
            <div className="mt-2 flex flex-wrap gap-2">
              {question.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setAnswer(question.id, choice)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    answers[question.id] === choice ? "bg-[#0067B1] text-white" : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {choice.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          : null}

          {question.type === "multi_choice" && question.choices ?
            <div className="mt-2 flex flex-wrap gap-2">
              {question.choices.map((choice) => {
                const selected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => toggleMulti(question.id, choice)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      selected ? "bg-[#0067B1] text-white" : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          : null}
        </div>
      ))}

      {supportsOutfitItems && onOutfitItemsChange ?
        <div className={`rounded-2xl border p-4 ${studioVisual.editorSurface} border-zinc-200`} data-testid="editor-fusion-outfit-items">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">{t("editor.fusion.outfit.itemsTitle" as never)}</p>
            <button
              type="button"
              onClick={addOutfitItem}
              className="text-xs font-semibold text-[#0067B1] hover:underline"
            >
              {t("editor.fusion.outfit.addItem" as never)}
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {outfitItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-zinc-700">
                    {t("editor.fusion.outfit.type" as never)}
                    <select
                      className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                      value={item.type}
                      onChange={(e) =>
                        onOutfitItemsChange(
                          outfitItems.map((row) =>
                            row.id === item.id ? { ...row, type: e.target.value as FusionOutfitItem["type"] } : row
                          )
                        )
                      }
                    >
                      {["jacket", "shirt", "pants", "shoes", "dress", "accessory", "full_outfit", "custom"].map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-zinc-700 sm:col-span-2">
                    {t("editor.fusion.outfit.description" as never)}
                    <input
                      className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                      value={item.description}
                      onChange={(e) =>
                        onOutfitItemsChange(
                          outfitItems.map((row) =>
                            row.id === item.id ? { ...row, description: e.target.value } : row
                          )
                        )
                      }
                      placeholder={t("editor.fusion.outfit.descriptionPlaceholder" as never)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      : null}
    </section>
  );
}
