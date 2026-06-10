"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  EDITOR_INTENT_HINT_KEYS,
  EDITOR_INTENT_LABEL_KEYS,
  EDITOR_USER_INTENTS,
} from "@/lib/editor-human-first-v5";
import type { EditorUserIntent } from "@/lib/editor-workspace-modes";

type Props = {
  onSelect: (intent: EditorUserIntent) => void;
};

export function EditorIntentPicker({ onSelect }: Props) {
  const t = useActiveTranslator();
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-slate-900">{t("editor.v5.intent.title" as never)}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("editor.v5.intent.lead" as never)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {EDITOR_USER_INTENTS.map((intent) => (
          <button
            key={intent}
            type="button"
            onClick={() => onSelect(intent)}
            className="rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5"
          >
            <p className="font-semibold text-slate-900">{t(EDITOR_INTENT_LABEL_KEYS[intent] as never)}</p>
            <p className="mt-1 text-xs text-slate-600">{t(EDITOR_INTENT_HINT_KEYS[intent] as never)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
