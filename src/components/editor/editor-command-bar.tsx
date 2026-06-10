"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorV7ContextualSuggestion } from "@/types/homecheff-visual-editor";

const EXAMPLE_KEYS = [
  "editor.v7.command.example1",
  "editor.v7.command.example2",
  "editor.v7.command.example3",
  "editor.v7.command.example4",
] as const;

type Props = {
  busy?: boolean;
  suggestions?: EditorV7ContextualSuggestion[];
  onSubmit: (prompt: string) => void;
  onSuggestionSelect?: (prompt: string) => void;
};

export function EditorCommandBar({ busy, suggestions = [], onSubmit, onSuggestionSelect }: Props) {
  const t = useActiveTranslator();
  const [value, setValue] = useState("");
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
      <label htmlFor="editor-command-input" className="mb-2 block text-sm font-semibold text-indigo-950">
        {t("editor.v7.command.label" as never)}
      </label>
      <div className="flex gap-2">
        <input
          id="editor-command-input"
          type="text"
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={t("editor.v7.command.placeholder" as never)}
          className="min-h-11 flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={busy || !value.trim()}
          onClick={handleSubmit}
          className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("editor.v7.command.submit" as never)}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowExamples((v) => !v)}
          className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
        >
          {showExamples
            ? t("editor.v7.command.hideExamples" as never)
            : t("editor.v7.command.showExamples" as never)}
        </button>
        {suggestions.slice(0, 4).map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => {
              onSuggestionSelect?.(s.prompt);
              onSubmit(s.prompt);
            }}
            className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
          >
            {t(s.labelKey as never)}
          </button>
        ))}
      </div>

      {showExamples ?
        <ul className="mt-3 space-y-1 text-xs text-indigo-800/80">
          {EXAMPLE_KEYS.map((key) => (
            <li key={key}>
              <button
                type="button"
                className="text-left hover:text-indigo-950 hover:underline"
                onClick={() => {
                  const text = t(key as never);
                  setValue(text);
                }}
              >
                “{t(key as never)}”
              </button>
            </li>
          ))}
        </ul>
      : null}
    </div>
  );
}
