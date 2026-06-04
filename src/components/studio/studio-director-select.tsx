"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

export type StudioDirectorSelectGroup =
  | "director"
  | "shot"
  | "movement"
  | "energy";

type Props = {
  label: string;
  group: StudioDirectorSelectGroup;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
};

export function StudioDirectorSelect({
  label,
  group,
  options,
  value,
  onChange,
  allowEmpty = true,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
      >
        {allowEmpty ?
          <option value="">—</option>
        : null}
        {options.map((option) => {
          const key = `studio.director.${group}.${option}` as TranslationKey;
          return (
            <option key={option} value={option}>
              {t(key)}
            </option>
          );
        })}
      </select>
    </div>
  );
}
