"use client";

import { useEffect, type ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  indexLabel?: string;
  children: ReactNode;
};

/** Fullscreen-safe preview — close always visible above app chrome. */
export function HomeCheffPreviewModal({
  open,
  title,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  indexLabel,
  children,
}: Props) {
  const t = useActiveTranslator();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasPrev, hasNext, onClose, onPrev, onNext]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="homecheff-preview-modal"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(92vh,calc(100dvh-5rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#041428]/95 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h3 className="truncate pr-2 text-base font-bold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {indexLabel ?
              <span className="text-xs text-white/60">{indexLabel}</span>
            : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-lg font-bold text-white hover:bg-white/15"
              aria-label={t("examples.gallery.close" as never)}
            >
              ×
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-4">{children}</div>
        {onPrev || onNext ?
          <footer className="flex shrink-0 items-center justify-between border-t border-white/10 px-4 py-3">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
            >
              {t("examples.gallery.prev" as never)}
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
            >
              {t("examples.gallery.next" as never)}
            </button>
          </footer>
        : null}
      </div>
    </div>
  );
}
