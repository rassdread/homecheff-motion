"use client";

import { useActiveTranslator } from "@/i18n/client";
import { formatAssistantRecommendationCardCopy } from "@/lib/assistant-recommendation-display";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

function statusBadge(status: AssistantRecommendation["status"]): { icon: string; className: string } {
  switch (status) {
    case "ready":
      return { icon: "✓", className: "text-emerald-700 bg-emerald-50" };
    case "missing":
      return { icon: "⚠", className: "text-amber-800 bg-amber-50" };
    default:
      return { icon: "▶", className: "text-sky-800 bg-sky-50" };
  }
}

type Props = {
  items: AssistantRecommendation[];
  onSelect: (recommendation: AssistantRecommendation) => void;
  compact?: boolean;
  showCta?: boolean;
};

export function AssistantRecommendationCards({
  items,
  onSelect,
  compact = false,
  showCta = false,
}: Props) {
  const t = useActiveTranslator();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const badge = statusBadge(item.status);
        const copy = formatAssistantRecommendationCardCopy(t, item);
        return (
          <button
            key={item.id}
            type="button"
            data-testid={`assistant-recommendation-${item.id}`}
            className={`group w-full rounded-xl border border-zinc-200/90 bg-gradient-to-br from-white via-white to-zinc-50/90 p-3 text-left shadow-sm transition hover:border-[#0067B1]/30 hover:shadow-md ${
              compact ? "p-2.5" : ""
            }`}
            onClick={() => onSelect(item)}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#006D52]/10 to-[#0067B1]/10 text-lg ${
                  compact ? "h-8 w-8 text-base" : ""
                }`}
                aria-hidden
              >
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold text-zinc-900 ${compact ? "text-[11px]" : "text-xs"}`}>
                  {copy.title}
                </p>
                {!compact ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-600">
                    {copy.description}
                  </p>
                ) : null}
                {copy.statusNote ? (
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                  >
                    <span aria-hidden>{badge.icon}</span>
                    {copy.statusNote}
                  </span>
                ) : null}
                {showCta ? (
                  <span
                    className={`${studioVisual.btnOutline} mt-2 inline-flex px-2.5 py-1 text-[10px] font-semibold opacity-90 group-hover:opacity-100`}
                  >
                    {t("assistant.growth.card.start" as never)}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
