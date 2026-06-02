"use client";

import { useEffect, useId, useRef, useState } from "react";

type StoryboardFieldHintProps = {
  label: string;
  hint: string;
};

export function StoryboardFieldHint({ label, hint }: StoryboardFieldHintProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const hintId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 text-[10px] font-semibold leading-none text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
        aria-label={hint}
        aria-expanded={open}
        aria-describedby={open ? hintId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ?
        <span
          id={hintId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 max-w-[min(16rem,90vw)] rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[11px] leading-snug text-zinc-600 shadow-md"
        >
          {hint}
        </span>
      : null}
    </span>
  );
}
