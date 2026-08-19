"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { studioHcContextualIntents } from "@/lib/studio-slice1a-home";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  /** When listing photos exist, links product video to from-item handoff route. */
  quickVideoHref: string;
};

export function StudioPx4ContextualIntentChooser({ quickVideoHref }: Props) {
  const t = useActiveTranslator();
  const intents = studioHcContextualIntents(quickVideoHref);

  return (
    <section className="space-y-4" data-testid="px4-contextual-intent-chooser">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {t("studio.slice1a.hc.chooser.title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          {t("studio.slice1a.hc.chooser.lead")}
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-1">
        {intents.map((intent) => (
          <li key={intent.id}>
            <Link
              href={intent.href}
              prefetch={false}
              data-testid={`px4-contextual-intent-${intent.id}`}
              className={`flex min-h-[72px] flex-col justify-center px-5 py-4 transition hover:border-[#006D52]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006D52] ${studioVisual.editorSurface}`}
            >
              <span className="text-base font-semibold text-zinc-900">{t(intent.titleKey)}</span>
              <span className="mt-1 text-sm text-zinc-600">{t(intent.descriptionKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
