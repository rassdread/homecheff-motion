"use client";

import { memo, type ReactNode } from "react";

type VoiceCenterCollapsibleSectionProps = {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  sectionId?: string;
};

export const VoiceCenterCollapsibleSection = memo(function VoiceCenterCollapsibleSection({
  title,
  summary,
  open,
  onToggle,
  children,
  sectionId,
}: VoiceCenterCollapsibleSectionProps) {
  return (
    <div className="mt-4">
      <button
        type="button"
        id={sectionId}
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-left hover:bg-violet-50/80"
      >
        <span aria-hidden className="shrink-0 text-violet-600">
          {open ? "▼" : "▶"}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-violet-950">{title}</span>
          {!open ?
            <span className="text-xs text-violet-700">{summary}</span>
          : null}
        </span>
      </button>
      {open ?
        <div className="mt-3">{children}</div>
      : null}
    </div>
  );
});
