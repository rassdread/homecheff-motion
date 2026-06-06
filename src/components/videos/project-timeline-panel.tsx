"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildProjectTimeline } from "@/lib/project-timeline";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type Props = {
  detail: AnimationProjectDetailResponse;
};

const KIND_COLOR: Record<string, string> = {
  created: "bg-zinc-400",
  studio_import: "bg-[#0067B1]",
  rendered: "bg-[#006D52]",
  text_edit: "bg-[#0067B1]",
  language: "bg-violet-500",
  full_rerender: "bg-amber-500",
};

export function ProjectTimelinePanel({ detail }: Props) {
  const t = useActiveTranslator();
  const events = useMemo(() => buildProjectTimeline(detail), [detail]);

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold text-zinc-900">{t("studio.aiAssistant.timeline.title")}</h2>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.aiAssistant.timeline.subtitle")}</p>
      <ol className="relative mt-6 space-y-0 border-l-2 border-[#006D52]/20 pl-6">
        {events.map((event) => {
          const inner = (
            <>
              <span
                className={`absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full ring-2 ring-white ${KIND_COLOR[event.kind] ?? "bg-zinc-400"}`}
                aria-hidden
              />
              <p className="text-xs font-semibold text-zinc-900">
                {t(event.labelKey as TranslationKey, event.params)}
              </p>
              <p className="text-[10px] text-zinc-500">
                {new Date(event.at).toLocaleString()}
              </p>
            </>
          );
          return (
            <li key={event.id} className="relative pb-6 last:pb-0">
              {event.href ?
                <Link href={event.href} prefetch={false} className="block hover:opacity-80">
                  {inner}
                </Link>
              : inner}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
