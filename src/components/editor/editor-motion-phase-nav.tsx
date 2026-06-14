"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { EDITOR_MOTION_MENU_ITEMS } from "@/lib/editor-workflow-phases";
import type { EditorMotionMenuItem } from "@/lib/editor-workflow-phases";

type Props = {
  unlocked: boolean;
  onOpenMotionReview?: () => void;
};

export function EditorMotionPhaseNav({ unlocked, onOpenMotionReview }: Props) {
  const t = useActiveTranslator();

  return (
    <nav
      className={`mt-2 flex flex-wrap gap-1.5 border-t border-zinc-200/80 p-2 pt-3 ${studioVisual.editorSurface}`}
      data-testid="editor-motion-phase-nav"
      aria-label={t("editor.workflow.phase.sectionMotion" as never)}
    >
      <p className="w-full px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.workflow.phase.sectionMotion" as never)}
        {!unlocked ?
          <span className="ml-2 font-normal normal-case text-amber-700">
            {t("editor.workflow.phase.motionLocked" as never)}
          </span>
        : null}
      </p>
      {EDITOR_MOTION_MENU_ITEMS.map((item: EditorMotionMenuItem) => (
        <button
          key={item}
          type="button"
          disabled={!unlocked}
          data-testid={`editor-motion-${item}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            unlocked
              ? "border border-zinc-200/90 bg-white/90 text-zinc-700 hover:border-[#0067B1]/30"
              : "cursor-not-allowed border border-zinc-100 bg-zinc-50 text-zinc-400"
          }`}
          onClick={() => unlocked && onOpenMotionReview?.()}
        >
          {t(`editor.workflow.motionMenu.${item}` as never)}
        </button>
      ))}
    </nav>
  );
}
