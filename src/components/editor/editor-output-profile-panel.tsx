"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  PRODUCTION_OUTPUT_PROFILES,
  resolveProductionOutputSpec,
  type ProductionOutputProfileId,
} from "@/lib/production-output-profiles";

type Props = {
  value: ProductionOutputProfileId;
  onChange: (profile: ProductionOutputProfileId) => void;
};

export function EditorOutputProfilePanel({ value, onChange }: Props) {
  const t = useActiveTranslator();
  const spec = resolveProductionOutputSpec(value);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{t("editor.outputProfile.title")}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductionOutputProfileId)}
        className="mt-2 w-full rounded-lg border border-zinc-200 p-2 text-sm"
      >
        {PRODUCTION_OUTPUT_PROFILES.map((id) => (
          <option key={id} value={id}>
            {t(resolveProductionOutputSpec(id).labelKey as never)}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-zinc-600">{t(spec.descriptionKey as never)}</p>
      <p className="mt-1 text-[11px] text-zinc-500">
        {spec.recommendedWidth}×{spec.recommendedHeight}px · {spec.formats.join(", ").toUpperCase()}
      </p>
    </div>
  );
}
