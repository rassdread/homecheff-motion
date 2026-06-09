"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

type Props = {
  infoKey: string;
  className?: string;
};

export function StudioWizardInfoButton({ infoKey, className = "" }: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const whatKey = `${infoKey}.what` as TranslationKey;
  const whenKey = `${infoKey}.when` as TranslationKey;
  const changesKey = `${infoKey}.changes` as TranslationKey;
  const risksKey = `${infoKey}.risks` as TranslationKey;
  const recommendedKey = `${infoKey}.recommended` as TranslationKey;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[10px] font-bold text-zinc-600 hover:border-[#0067B1] hover:text-[#0067B1]"
        aria-label={t("studio.workbench.info.open")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ
      </button>
      {open ?
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 bottom-4 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl md:absolute md:inset-auto md:bottom-auto md:left-0 md:top-full md:mt-2 md:w-80 md:max-h-none">
            <InfoSection title={t("studio.workbench.info.whatTitle")} body={t(whatKey)} />
            <InfoSection title={t("studio.workbench.info.whenTitle")} body={t(whenKey)} />
            <InfoSection title={t("studio.workbench.info.changesTitle")} body={t(changesKey)} />
            <InfoSection title={t("studio.workbench.info.risksTitle")} body={t(risksKey)} />
            <InfoSection title={t("studio.workbench.info.recommendedTitle")} body={t(recommendedKey)} />
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-zinc-100 py-2 text-sm font-semibold text-zinc-800 md:hidden"
              onClick={() => setOpen(false)}
            >
              {t("studio.workbench.info.close")}
            </button>
          </div>
        </>
      : null}
    </div>
  );
}

function InfoSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-sm text-zinc-800">{body}</p>
    </div>
  );
}
