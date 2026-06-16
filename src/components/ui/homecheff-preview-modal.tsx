"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useActiveTranslator } from "@/i18n/client";
import { lockPreviewModalBodyScroll } from "@/lib/homecheff-preview-modal-body-lock";
import { resolvePreviewModalKeyAction } from "@/lib/homecheff-preview-modal-logic";
import { studioVisual } from "@/lib/studio-visual-tokens";

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

const MODAL_SAFE_CLOSE =
  "top-[calc(env(safe-area-inset-top)+16px)] right-[calc(env(safe-area-inset-right)+16px)]";
const MODAL_SAFE_PREV =
  "left-[calc(env(safe-area-inset-left)+16px)]";
const MODAL_SAFE_NEXT =
  "right-[calc(env(safe-area-inset-right)+16px)]";

/** Fullscreen app-level preview — portaled to document.body above Growth Sidebar. */
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
  const closeLabel = t("examples.gallery.close" as never);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const action = resolvePreviewModalKeyAction(e.key, { hasPrev, hasNext });
      if (action === "close") onClose();
      if (action === "prev") onPrev?.();
      if (action === "next") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasPrev, hasNext, onClose, onPrev, onNext]);

  useEffect(() => {
    if (!open) return;
    return lockPreviewModalBodyScroll();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={studioVisual.appModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="homecheff-preview-modal"
      data-portal-target="document.body"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        data-testid="homecheff-preview-modal-close"
        aria-label={closeLabel}
        className={`${studioVisual.appModalClose} ${MODAL_SAFE_CLOSE}`}
      >
        <span aria-hidden="true">✕</span>
      </button>

      {onPrev ?
        <button
          type="button"
          disabled={!hasPrev}
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          data-testid="homecheff-preview-modal-prev"
          className={`${studioVisual.appModalNavBtn} ${MODAL_SAFE_PREV}`}
        >
          {t("examples.gallery.prev" as never)}
        </button>
      : null}

      {onNext ?
        <button
          type="button"
          disabled={!hasNext}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          data-testid="homecheff-preview-modal-next"
          className={`${studioVisual.appModalNavBtn} ${MODAL_SAFE_NEXT}`}
        >
          {t("examples.gallery.next" as never)}
        </button>
      : null}

      <div
        className="relative flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#041428]/95 shadow-2xl backdrop-blur-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/10 bg-[#041428]/90 px-4 py-3 pr-16 backdrop-blur-xl">
          <h3 className="truncate text-base font-bold text-white">{title}</h3>
          {indexLabel ?
            <p className="mt-0.5 text-xs text-white/60">{indexLabel}</p>
          : null}
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
