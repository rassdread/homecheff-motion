"use client";

type Props = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

export function StudioDirectorCardSelect({
  label,
  selected,
  onSelect,
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
        selected
          ? "border-[#006D52] bg-[#006D52]/10 text-[#006D52]"
          : "border-zinc-200 bg-zinc-50/80 text-zinc-800 hover:border-zinc-300"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}
