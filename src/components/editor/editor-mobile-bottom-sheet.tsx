"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Mobile-friendly bottom sheet (min 44px touch targets in children). */
export function EditorMobileBottomSheet({ open, title, onClose, children }: Props) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-lg px-3 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
