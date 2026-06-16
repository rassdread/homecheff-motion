"use client";

import { useActiveTranslator } from "@/i18n/client";
import type {
  AssistantRecommendation,
  AssistantRecommendationCategory,
} from "@/types/assistant-recommendation";

const CATEGORY_ORDER: AssistantRecommendationCategory[] = [
  "for_you",
  "continue_working",
  "trending",
  "hidden_possibilities",
  "quick_starts",
];

const CATEGORY_LABEL: Record<AssistantRecommendationCategory, `assistant.recommendations.section.${string}`> = {
  for_you: "assistant.recommendations.section.forYou",
  continue_working: "assistant.recommendations.section.continue",
  trending: "assistant.recommendations.section.trending",
  hidden_possibilities: "assistant.recommendations.section.hidden",
  quick_starts: "assistant.recommendations.section.quickStarts",
};

function statusBadge(status: AssistantRecommendation["status"]): { icon: string; className: string } {
  switch (status) {
    case "ready":
      return { icon: "✓", className: "text-emerald-700" };
    case "missing":
      return { icon: "⚠", className: "text-amber-700" };
    default:
      return { icon: "▶", className: "text-sky-700" };
  }
}

type Props = {
  recommendations: AssistantRecommendation[];
  onSelect: (recommendation: AssistantRecommendation) => void;
  loading?: boolean;
};

export function AssistantRecommendationPanel({ recommendations, onSelect, loading = false }: Props) {
  const t = useActiveTranslator();

  if (loading) {
    return (
      <div className="border-t border-zinc-100 pt-3 text-xs text-zinc-500" data-testid="assistant-recommendation-panel">
        {t("assistant.recommendations.loading" as never)}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: recommendations.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className="mt-3 flex min-h-0 flex-col border-t border-zinc-100 pt-3"
      data-testid="assistant-recommendation-panel"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("assistant.recommendations.title" as never)}
      </p>
      <p className="mt-1 text-[11px] text-zinc-400">
        {t("assistant.recommendations.subtitle" as never)}
      </p>

      <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {grouped.map((group) => (
          <div key={group.category}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {t(CATEGORY_LABEL[group.category] as never)}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => {
                const badge = statusBadge(item.status);
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`assistant-recommendation-${item.id}`}
                    className="w-full rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/80 p-3 text-left shadow-sm transition hover:border-[#0067B1]/25 hover:shadow-md"
                    onClick={() => onSelect(item)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-none" aria-hidden>
                        {item.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-900">
                          {t(item.titleKey as never, {
                            defaultValue: item.promptMessage,
                            name: item.characterName ?? "",
                          })}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">
                          {t(item.descriptionKey as never, {
                            defaultValue: item.promptMessage,
                          })}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          {t(item.whyKey as never, {
                            defaultValue: "",
                          })}
                        </p>
                        {item.statusNoteKey ? (
                          <p className={`mt-1 text-[10px] font-medium ${badge.className}`}>
                            <span aria-hidden>{badge.icon} </span>
                            {t(item.statusNoteKey as never, {
                              name: item.characterName ?? "",
                            })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
