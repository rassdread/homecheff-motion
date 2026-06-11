"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  resolveCommandExampleKeys,
  resolveMagicPlaceholderKeys,
} from "@/lib/editor-personalized-recommendations";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorV7ContextualSuggestion } from "@/types/homecheff-visual-editor";

type Props = {
  busy?: boolean;
  document?: EditorCanvasDocument;
  isAdmin?: boolean;
  suggestions?: EditorV7ContextualSuggestion[];
  variant?: "default" | "magic";
  onSubmit: (prompt: string) => void;
  onSuggestionSelect?: (prompt: string) => void;
};

export function EditorCommandBar({
  busy,
  document,
  isAdmin = false,
  suggestions = [],
  variant = "default",
  onSubmit,
  onSuggestionSelect,
}: Props) {
  const t = useActiveTranslator();
  const [value, setValue] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const isMagic = variant === "magic";
  const recCtx = document
    ? buildEditorRecommendationContext({ document, isAdmin })
    : buildEditorRecommendationContext({
        document: {
          sessionId: "ephemeral",
          name: "",
          sourceKind: "upload",
          sourceAssetId: null,
          backgroundUrl: "",
          workflowStep: "visual_editor",
          objects: [],
          placements: [],
          status: "editing",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isAdmin,
      });
  const magicPlaceholderKeys = resolveMagicPlaceholderKeys(recCtx);
  const exampleKeys = resolveCommandExampleKeys(recCtx);

  useEffect(() => {
    if (!isMagic) {
      return;
    }
    const timer = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % magicPlaceholderKeys.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isMagic, magicPlaceholderKeys.length]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || busy) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  };

  const placeholder = isMagic
    ? t(magicPlaceholderKeys[placeholderIndex]! as never)
    : t("editor.v7.command.placeholder" as never);

  return (
    <div
      className={
        isMagic
          ? "rounded-xl bg-white/90 p-4"
          : "rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm"
      }
    >
      <label
        htmlFor="editor-command-input"
        className={`mb-2 block font-semibold text-indigo-950 ${isMagic ? "text-base" : "text-sm"}`}
      >
        {t(isMagic ? ("editor.uxV7.magic.label" as never) : ("editor.v7.command.label" as never))}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
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
          placeholder={placeholder}
          className={`flex-1 rounded-xl border border-indigo-200 bg-white px-4 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 ${
            isMagic ? "min-h-14 py-3 text-base" : "min-h-11 py-2 text-sm"
          }`}
        />
        <button
          type="button"
          disabled={busy || !value.trim()}
          onClick={handleSubmit}
          className={`rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 ${
            isMagic ? "min-h-14 px-8 py-3 text-base" : "min-h-11 px-5 py-2 text-sm"
          }`}
        >
          {t(isMagic ? ("editor.uxV7.magic.submit" as never) : ("editor.v7.command.submit" as never))}
        </button>
      </div>

      {!isMagic ?
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
      : null}

      {!isMagic && showExamples ?
        <ul className="mt-3 space-y-1 text-xs text-indigo-800/80">
          {exampleKeys.map((key: TranslationKey) => (
            <li key={key}>
              <button
                type="button"
                className="text-left hover:text-indigo-950 hover:underline"
                onClick={() => setValue(t(key as never))}
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
