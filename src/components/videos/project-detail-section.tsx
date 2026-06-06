"use client";

import type { ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

type Props = {
  id: string;
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  children: ReactNode;
  className?: string;
};

export function ProjectDetailSection({
  id,
  titleKey,
  descriptionKey,
  children,
  className = "",
}: Props) {
  const t = useActiveTranslator();

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-24 rounded-2xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm sm:p-5 ${className}`}
    >
      <header className="mb-4 border-b border-zinc-100 pb-3">
        <h2 id={`${id}-title`} className="text-sm font-bold text-zinc-900">
          {t(titleKey)}
        </h2>
        {descriptionKey ?
          <p className="mt-1 text-xs text-zinc-600">{t(descriptionKey)}</p>
        : null}
      </header>
      {children}
    </section>
  );
}
