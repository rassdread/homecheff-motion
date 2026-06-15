"use client";

import type { ReactNode } from "react";
import { StudioDirectorInfoButton } from "@/components/studio/director-v2/studio-director-info-button";
import type { StudioDirectorV2InfoKey } from "@/types/studio-director-v2-info";

type Props = {
  title: string;
  infoKey?: StudioDirectorV2InfoKey;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
};

export function StudioDirectorAccordionSection({
  title,
  infoKey,
  open,
  onToggle,
  children,
  badge,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex w-full items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span className="text-xs text-zinc-400">{open ? "▼" : "▶"}</span>
          <span className="flex-1 text-sm font-semibold text-zinc-900">{title}</span>
          {badge ?
            <span className="rounded-full bg-[#006D52]/10 px-2 py-0.5 text-[10px] font-semibold text-[#006D52]">
              {badge}
            </span>
          : null}
        </button>
        {infoKey ?
          <StudioDirectorInfoButton infoKey={infoKey} />
        : null}
      </div>
      {open ?
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3">{children}</div>
      : null}
    </section>
  );
}
