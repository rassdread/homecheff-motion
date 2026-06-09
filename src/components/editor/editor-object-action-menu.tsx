"use client";

import type { EditorHumanAction } from "@/lib/editor-human-first";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  actions: EditorHumanAction[];
  objectLabel: string;
  onAction: (actionId: EditorHumanAction["id"]) => void;
  onClose: () => void;
};

export function EditorObjectActionMenu({ actions, objectLabel, onAction, onClose }: Props) {
  const t = useActiveTranslator();

  return (
    <div
      className="absolute z-30 min-w-[220px] max-w-[min(92vw,280px)] rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-xl backdrop-blur-md"
      role="menu"
      aria-label={t("editor.human.actionMenuFor", { name: objectLabel })}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-2 pb-2">
        <p className="truncate text-sm font-semibold text-zinc-900">{objectLabel}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
          aria-label={t("editor.human.closeMenu")}
        >
          ✕
        </button>
      </div>
      <ul className="mt-1 max-h-[min(50vh,320px)] overflow-y-auto">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              role="menuitem"
              onClick={() => onAction(action.id)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-800 hover:bg-[#0067B1]/8 focus-visible:bg-[#0067B1]/10 focus-visible:outline-none"
            >
              <span aria-hidden>{action.icon}</span>
              <span>{t(action.labelKey)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
