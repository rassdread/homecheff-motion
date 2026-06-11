"use client";

import { useActiveTranslator } from "@/i18n/client";
import { EDITOR_WORKFLOW_PRODUCTS } from "@/lib/editor-workflow-product";
import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  busy?: boolean;
  onSelectWorkflow: (mode: EditorPostUploadMode) => void;
};

export function EditorWorkflowChooser({ busy, onSelectWorkflow }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="editor-workflow-chooser">
      {EDITOR_WORKFLOW_PRODUCTS.map((product) => (
        <button
          key={product.mode}
          type="button"
          disabled={busy}
          data-workflow={product.mode}
          onClick={() => onSelectWorkflow(product.mode)}
          className={`flex min-h-[180px] flex-col items-start p-6 text-left transition hover:shadow-md disabled:opacity-50 ${studioVisual.editorSurface}`}
        >
          <span className="text-3xl" aria-hidden>
            {product.icon}
          </span>
          <span className="mt-3 text-lg font-bold text-zinc-900">
            {t(product.titleKey as never)}
          </span>
          <span className="mt-1 text-sm text-zinc-600">{t(product.leadKey as never)}</span>
          <span className="mt-2 text-xs text-zinc-500">{t(product.examplesKey as never)}</span>
          <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#0067B1]">
            {t(product.inputKey as never)} → {t(product.outputKey as never)}
          </span>
        </button>
      ))}
    </div>
  );
}
