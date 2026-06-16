"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

type Props = {
  prefill: AssistantPrefillPackage;
  onClear: () => void;
  onAdjust?: () => void;
};

export function AssistantWizardPrefillBanner({ prefill, onClear, onAdjust }: Props) {
  const t = useActiveTranslator();

  return (
    <div
      className="mb-4 rounded-2xl border border-[#0067B1]/25 bg-[#0067B1]/5 p-4"
      data-testid="assistant-wizard-prefill-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {prefill.motion?.presetTitle
              ? `${prefill.motion.presetTitle} — ${t("assistant.prefill.banner.title" as never)}`
              : t("assistant.prefill.banner.title" as never)}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {t(prefill.understoodKey as never)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${studioVisual.btnOutline} px-3 py-1.5 text-xs`}
            data-testid="assistant-prefill-adjust"
            onClick={onAdjust}
          >
            {t("assistant.prefill.banner.adjust" as never)}
          </button>
          <button
            type="button"
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600"
            data-testid="assistant-prefill-clear"
            onClick={onClear}
          >
            {t("assistant.prefill.banner.clear" as never)}
          </button>
        </div>
      </div>
      {prefill.settingLabelKeys.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-zinc-700">
          {prefill.settingLabelKeys.map((key) => (
            <li key={key}>• {t(key as never)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
