"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorImagePhase } from "@/types/editor-instruction-studio";
import { EDITOR_IMAGE_PHASES } from "@/types/editor-instruction-studio";

type Props = {
  activePhase: EditorImagePhase;
  onPhaseChange: (phase: EditorImagePhase) => void;
};

export function EditorImagePhaseNav({ activePhase, onPhaseChange }: Props) {
  const t = useActiveTranslator();

  return (
    <nav
      className={`flex flex-wrap gap-1.5 p-2 ${studioVisual.editorSurface}`}
      data-testid="editor-image-phase-nav"
      aria-label={t("editor.workflow.phase.navLabel" as never)}
    >
      <p className="w-full px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.workflow.phase.sectionEditor" as never)}
      </p>
      {EDITOR_IMAGE_PHASES.map((phase) => {
        const active = phase === activePhase;
        return (
          <button
            key={phase}
            type="button"
            data-testid={`editor-phase-${phase}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-[#0067B1] text-white shadow-sm"
                : "border border-zinc-200/90 bg-white/90 text-zinc-700 hover:border-[#0067B1]/30"
            }`}
            onClick={() => onPhaseChange(phase)}
          >
            {t(`editor.workflow.phase.${phase}` as never)}
          </button>
        );
      })}
    </nav>
  );
}
