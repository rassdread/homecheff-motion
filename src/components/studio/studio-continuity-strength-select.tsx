"use client";

import {
  STUDIO_CONTINUITY_STRENGTHS,
  type StudioContinuityStrength,
} from "@/lib/studio-continuity-strength";
import { useActiveTranslator } from "@/i18n/client";

type StudioContinuityStrengthSelectProps = {
  label: string;
  value: StudioContinuityStrength;
  onChange: (value: StudioContinuityStrength) => void;
  disabled?: boolean;
};

export function StudioContinuityStrengthSelect({
  label,
  value,
  onChange,
  disabled,
}: StudioContinuityStrengthSelectProps) {
  const t = useActiveTranslator();

  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as StudioContinuityStrength)}
      >
        {STUDIO_CONTINUITY_STRENGTHS.map((strength) => (
          <option key={strength} value={strength}>
            {t(`studio.memory.continuityStrength.${strength}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
