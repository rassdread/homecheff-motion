"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  sessionId: string;
  onBackToEditor: () => void;
  onStartNew: () => void;
  onRemoveBrokenSession: () => void;
};

export function EditorSessionRecoveryPanel({
  sessionId,
  onBackToEditor,
  onStartNew,
  onRemoveBrokenSession,
}: Props) {
  const t = useActiveTranslator();

  return (
    <main
      className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-6 p-8"
      data-testid="editor-session-recovery"
    >
      <div className={`${studioVisual.cardGlass} space-y-3 p-6`}>
        <h1 className="text-lg font-semibold text-white">
          {t("editor.sessionRecovery.title" as never)}
        </h1>
        <p className="text-sm text-white/75">{t("editor.sessionRecovery.body" as never)}</p>
        <p className="font-mono text-xs text-white/50">{sessionId}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            onClick={onBackToEditor}
          >
            {t("editor.sessionRecovery.backToEditor" as never)}
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            onClick={onStartNew}
          >
            {t("editor.sessionRecovery.startNew" as never)}
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-400/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
            onClick={onRemoveBrokenSession}
          >
            {t("editor.sessionRecovery.removeBroken" as never)}
          </button>
        </div>
      </div>
    </main>
  );
}
