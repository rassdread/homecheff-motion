"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildCharacterStudioFlowHref,
  hubVisibleCharacterStudioFlows,
} from "@/lib/character-studio-hub";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { CharacterStudioFlowId } from "@/types/character-studio-hub";

export function StudioCharacterStudioHub() {
  const t = useActiveTranslator();
  const router = useRouter();
  const flows = hubVisibleCharacterStudioFlows();

  const handleSelect = (flowId: CharacterStudioFlowId) => {
    router.push(buildCharacterStudioFlowHref(flowId));
  };

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/studio/characters"
          className="text-sm font-medium text-[#006D52] hover:underline"
        >
          ← {t("studio.placeholder.back" as never)}
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#006D52]">
          {t("characterStudio.hub.eyebrow" as never)}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
          {t("characterStudio.hub.title" as never)}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base">
          {t("characterStudio.hub.lead" as never)}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-zinc-600">
          {(
            [
              "characterStudio.hub.bullet1",
              "characterStudio.hub.bullet2",
              "characterStudio.hub.bullet3",
              "characterStudio.hub.bullet4",
              "characterStudio.hub.bullet5",
              "characterStudio.hub.bullet6",
              "characterStudio.hub.bullet7",
              "characterStudio.hub.bullet8",
            ] as const
          ).map((key) => (
            <li key={key} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{t(key as never)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm font-semibold text-zinc-800">
          {t("characterStudio.hub.choose" as never)}
        </p>

        <div className="mt-4 space-y-3" data-testid="character-studio-hub-choices">
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              data-flow-id={flow.id}
              onClick={() => handleSelect(flow.id)}
              className={`flex w-full flex-col items-start rounded-2xl border p-4 text-left transition hover:shadow-md ${studioVisual.editorSurface}`}
            >
              <span className="text-base font-bold text-zinc-900">
                {t(flow.titleKey as never)}
              </span>
              <span className="mt-1 text-sm text-zinc-600">
                {t(flow.descriptionKey as never)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
