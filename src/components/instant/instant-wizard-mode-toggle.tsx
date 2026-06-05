"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { InstantWizardMode } from "@/lib/instant-wizard-mode";

type Props = {
  mode: InstantWizardMode;
  onChange: (mode: InstantWizardMode) => void;
  disabled?: boolean;
};

export function InstantWizardModeToggle({ mode, onChange, disabled }: Props) {
  const t = useActiveTranslator();

  return (
    <div
      className="inline-flex rounded-full border border-zinc-200 bg-white p-0.5 text-[11px] font-semibold sm:text-xs"
      role="group"
      aria-label={t("instant.wizardMode.label")}
    >
      {(["beginner", "expert"] as const).map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1.5 transition-colors sm:px-4 ${
            mode === value
              ? "bg-[#006D52] text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          }`}
          aria-pressed={mode === value}
        >
          {t(value === "beginner" ? "instant.wizardMode.beginner" : "instant.wizardMode.expert")}
        </button>
      ))}
    </div>
  );
}
