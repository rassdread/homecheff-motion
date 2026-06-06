"use client";

import { useActiveTranslator } from "@/i18n/client";
import { useStudioAdvancedFeatures } from "@/lib/studio-advanced-features";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";

type Props = {
  className?: string;
};

export function StudioAdvancedFeaturesToggle({ className = "" }: Props) {
  const t = useActiveTranslator();
  const [advanced, setAdvanced] = useStudioAdvancedFeatures();

  if (!isStudioProductionModeEnabled()) {
    return null;
  }

  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 ${className}`}
    >
      <input
        type="checkbox"
        checked={advanced}
        onChange={(e) => setAdvanced(e.target.checked)}
        className="size-4 rounded border-zinc-300 text-[#006D52] focus:ring-[#006D52]"
      />
      <span>{t("studio.productionMode.advancedToggle")}</span>
    </label>
  );
}
