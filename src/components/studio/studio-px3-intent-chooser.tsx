"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { PX3_INTENTS, type Px3IntentId } from "@/lib/studio-px3-home";
import { studioVisual } from "@/lib/studio-visual-tokens";

const PX4_INTENT_DESC: Record<Px3IntentId, TranslationKey> = {
  image: "px4.intent.image.desc",
  video: "px4.intent.video.desc",
  story: "px4.intent.story.desc",
  animation: "px4.intent.animation.desc",
  edit: "px4.intent.edit.desc",
};

export function StudioPx3IntentChooser({ contextual = false }: { contextual?: boolean }) {
  const t = useActiveTranslator();

  return (
    <section className="space-y-4" data-testid="px3-intent-chooser">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {t("studio.experience.chooser.title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          {contextual ? t("px4.chooser.lead") : t("px3.chooser.lead")}
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PX3_INTENTS.map((intent) => (
          <li key={intent.id}>
            <Link
              href={intent.href}
              prefetch={false}
              data-testid={`px3-intent-${intent.id}`}
              className={`flex min-h-[72px] flex-col justify-center px-5 py-4 transition hover:border-[#006D52]/40 hover:shadow-md ${studioVisual.editorSurface}`}
            >
              <span className="text-base font-semibold text-zinc-900">{t(intent.titleKey)}</span>
              <span className="mt-1 text-sm text-zinc-600">
                {contextual ? t(PX4_INTENT_DESC[intent.id]) : t(intent.descriptionKey)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
