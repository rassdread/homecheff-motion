"use client";

import { useEffect, useId, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";

/** Tailwind `lg` breakpoint — sheet is `lg:hidden`, body lock must match. */
export const MOTION_BOTTOM_SHEET_MOBILE_MQ = "(max-width: 1023px)";

export function shouldMotionBottomSheetLockBody(input: {
  open: boolean;
  lockBodyScroll: boolean;
  mobileViewport: boolean;
}): boolean {
  return input.open && input.lockBodyScroll && input.mobileViewport;
}

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** When false, never locks document body (default true). */
  lockBodyScroll?: boolean;
};

export function MotionBottomSheet({
  open,
  title,
  onClose,
  children,
  lockBodyScroll = true,
}: Props) {
  const t = useActiveTranslator();
  const titleId = useId();
  const [mobileViewport, setMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOTION_BOTTOM_SHEET_MOBILE_MQ);
    const sync = () => setMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const lockBody = shouldMotionBottomSheetLockBody({
    open,
    lockBodyScroll,
    mobileViewport,
  });

  useEffect(() => {
    if (!lockBody) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lockBody]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        aria-label={t("studio.directorV2.info.close")}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[min(88vh,720px)] flex-col rounded-t-3xl border border-zinc-200 bg-white shadow-2xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div className="flex shrink-0 items-center justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-zinc-300" aria-hidden />
        </div>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <h2 id={titleId} className="text-sm font-bold text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-full border border-zinc-200 px-3 text-xs font-semibold text-zinc-700"
          >
            {t("studio.directorV2.info.close")}
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
