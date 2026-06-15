"use client";

import type { ReactNode } from "react";

type Props = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  testId?: string;
  ariaLabel?: string;
};

export function PublishMediaTabButton({
  active,
  onClick,
  children,
  disabled = false,
  disabledReason,
  testId,
  ariaLabel,
}: Props) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      aria-disabled={disabled}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067B1] ${
        disabled
          ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
          : active
            ? "border-[#0067B1] bg-[#0067B1]/15 text-[#0067B1] shadow-sm"
            : "cursor-pointer border-zinc-300 bg-white text-zinc-700 hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5"
      }`}
    >
      {children}
    </button>
  );
}
