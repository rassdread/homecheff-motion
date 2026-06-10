"use client";

import { useActiveTranslator } from "@/i18n/client";
import { EditorMagicEditBar } from "@/components/editor/editor-magic-edit-bar";
import {
  EDITOR_POST_UPLOAD_HINT_KEYS,
  EDITOR_POST_UPLOAD_LABEL_KEYS,
  EDITOR_POST_UPLOAD_MODES,
  type EditorPostUploadMode,
} from "@/lib/editor-start-flow";

type Props = {
  imageName: string;
  busy?: boolean;
  onSelectMode: (mode: EditorPostUploadMode) => void;
  onMagicCommand?: (prompt: string) => void;
};

const MODE_ICONS: Record<EditorPostUploadMode, string> = {
  edit: "✏️",
  combine: "🧩",
  motion_prepare: "🎬",
  export: "📤",
};

export function EditorPostUploadModePicker({ imageName, busy, onSelectMode, onMagicCommand }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
          {t("editor.startFlow.ready" as never)}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          {t("editor.startFlow.modeTitle" as never)}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{imageName}</p>
      </div>

      {onMagicCommand ?
        <EditorMagicEditBar busy={busy} onSubmit={onMagicCommand} />
      : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {EDITOR_POST_UPLOAD_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            onClick={() => onSelectMode(mode)}
            className="flex min-h-[110px] flex-col items-start rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5 disabled:opacity-50"
          >
            <span className="text-2xl" aria-hidden>
              {MODE_ICONS[mode]}
            </span>
            <span className="mt-2 font-semibold text-slate-900">
              {t(EDITOR_POST_UPLOAD_LABEL_KEYS[mode] as never)}
            </span>
            <span className="mt-1 text-xs text-slate-600">
              {t(EDITOR_POST_UPLOAD_HINT_KEYS[mode] as never)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
