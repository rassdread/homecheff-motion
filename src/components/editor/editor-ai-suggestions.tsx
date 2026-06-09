"use client";

import type { EditorHumanSuggestion } from "@/lib/editor-human-first";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  suggestions: EditorHumanSuggestion[];
  onSelect: (suggestionId: string) => void;
};

export function EditorAiSuggestions({ suggestions, onSelect }: Props) {
  const t = useActiveTranslator();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#0067B1]/15 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.human.suggestionsTitle")}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              onClick={() => onSelect(suggestion.id)}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067B1]"
            >
              ✓ {t(suggestion.labelKey)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
