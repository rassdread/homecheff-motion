"use client";

import { useActiveTranslator } from "@/i18n/client";
import { computeStudioHandoffScore } from "@/lib/editor-v6-handoff-score";
import { skillLabelKey } from "@/lib/editor-v7-action-plan";
import {
  canRedoCommandHistory,
  canUndoCommandHistory,
} from "@/lib/editor-v7-command-history";
import { resolveContextualCommandSuggestions } from "@/lib/editor-v7-suggestions";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  onSuggestion: (prompt: string) => void;
  onUndoCommand: () => void;
  onRedoCommand: () => void;
  onRerunCommand: (entryId: string) => void;
  onDuplicateCommand: (entryId: string) => void;
};

export function EditorAssistantSidebar({
  document,
  collapsed,
  onToggleCollapse,
  onSuggestion,
  onUndoCommand,
  onRedoCommand,
  onRerunCommand,
  onDuplicateCommand,
}: Props) {
  const t = useActiveTranslator();
  const state = document.assistantState;
  const suggestions = resolveContextualCommandSuggestions(document);
  const handoff = computeStudioHandoffScore(document);
  const recentExports = (document.libraryExports ?? []).slice(-3).reverse();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="fixed right-4 top-28 z-20 rounded-full border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 shadow-md lg:static"
      >
        {t("editor.v7.assistant.open" as never)}
      </button>
    );
  }

  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-indigo-950">{t("editor.v7.assistant.title" as never)}</h2>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
        >
          {t("editor.v7.assistant.collapse" as never)}
        </button>
      </div>

      {state?.activePlan ?
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-xs font-semibold uppercase text-violet-700">
            {t("editor.v7.assistant.currentPlan" as never)}
          </p>
          <p className="mt-1 text-sm text-violet-950">{state.activePlan.prompt}</p>
          {state.activePlan.skillId ?
            <p className="mt-1 text-xs text-violet-600">
              {t(skillLabelKey(state.activePlan.skillId) as never)}
            </p>
          : null}
        </div>
      : null}

      <div className="rounded-xl border border-indigo-100 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-indigo-700">
          {t("editor.v7.assistant.suggestions" as never)}
        </p>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSuggestion(s.prompt)}
              className="rounded-lg border border-indigo-100 px-3 py-2 text-left text-xs font-medium text-indigo-900 hover:bg-indigo-50"
            >
              {t(s.labelKey as never)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-indigo-700">
            {t("editor.v7.assistant.history" as never)}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!canUndoCommandHistory(document)}
              onClick={onUndoCommand}
              className="rounded px-2 py-0.5 text-xs text-indigo-700 disabled:opacity-40"
            >
              {t("editor.v7.assistant.undo" as never)}
            </button>
            <button
              type="button"
              disabled={!canRedoCommandHistory(document)}
              onClick={onRedoCommand}
              className="rounded px-2 py-0.5 text-xs text-indigo-700 disabled:opacity-40"
            >
              {t("editor.v7.assistant.redo" as never)}
            </button>
          </div>
        </div>
        {(state?.history ?? []).length === 0 ?
          <p className="text-xs text-zinc-500">{t("editor.v7.assistant.historyEmpty" as never)}</p>
        : <ol className="space-y-2">
            {[...(state?.history ?? [])].reverse().map((entry, index) => (
              <li key={entry.id} className="rounded-lg bg-indigo-50/50 px-2 py-1.5 text-xs text-indigo-950">
                <span className="font-medium text-indigo-600">{index + 1}.</span> {entry.prompt}
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRerunCommand(entry.id)}
                    className="text-indigo-700 hover:underline"
                  >
                    {t("editor.v7.assistant.rerun" as never)}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateCommand(entry.id)}
                    className="text-indigo-700 hover:underline"
                  >
                    {t("editor.v7.assistant.duplicate" as never)}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        }
      </div>

      {recentExports.length > 0 ?
        <div className="rounded-xl border border-indigo-100 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-indigo-700">
            {t("editor.v7.assistant.recentExports" as never)}
          </p>
          <ul className="space-y-1 text-xs text-indigo-900">
            {recentExports.map((exp) => (
              <li key={exp.id}>{exp.label}</li>
            ))}
          </ul>
        </div>
      : null}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-xs font-semibold uppercase text-emerald-800">
          {t("editor.v7.assistant.motionReadiness" as never)}
        </p>
        <p className="mt-1 text-lg font-bold text-emerald-900">{handoff.score}%</p>
        <p className="text-xs text-emerald-800">{t(handoff.labelKey as never)}</p>
      </div>
    </aside>
  );
}
