"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { WizardChoiceOption, WizardChoiceStepDef } from "@/lib/studio-asset-wizard-choices";

type Props = {
  def: WizardChoiceStepDef;
  selectedId: string | null;
  customText: string;
  onSelect: (optionId: string) => void;
  onCustomTextChange: (text: string) => void;
  disabledOptionIds?: string[];
  disabledHintKey?: string;
};

export function StudioWizardChoiceGrid({
  def,
  selectedId,
  customText,
  onSelect,
  onCustomTextChange,
  disabledOptionIds = [],
  disabledHintKey,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-zinc-900">{t(def.titleKey as never)}</p>
        {def.hintKey ?
          <p className="mt-1 text-sm text-zinc-600">{t(def.hintKey as never)}</p>
        : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {def.options.map((option) => (
          <ChoiceChip
            key={option.id}
            option={option}
            selected={selectedId === option.id}
            disabled={disabledOptionIds.includes(option.id)}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>
      {selectedId && disabledOptionIds.includes(selectedId) && disabledHintKey ?
        <p className="text-xs text-amber-700">{t(disabledHintKey as never)}</p>
      : null}
      {def.allowsCustom && selectedId === "custom" ?
        <label className="block text-sm font-medium text-zinc-800">
          {t("studio.assetCreation.choices.customLabel")}
          <input
            className="mt-2 w-full min-h-[48px] rounded-xl border border-zinc-200 px-4 py-3 text-base"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder={t("studio.assetCreation.choices.customPlaceholder")}
          />
        </label>
      : null}
    </div>
  );
}

function ChoiceChip({
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: WizardChoiceOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const t = useActiveTranslator();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${
        disabled
          ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400"
          : selected
            ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1] ring-2 ring-[#0067B1]/30"
            : "border-zinc-200 bg-white text-zinc-800 hover:border-[#0067B1]/40 active:bg-zinc-50"
      }`}
    >
      {option.emoji ?
        <span className="text-xl leading-none" aria-hidden>
          {option.emoji}
        </span>
      : null}
      <span className="leading-tight">{t(option.labelKey as never)}</span>
    </button>
  );
}
