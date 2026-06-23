"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { buildCharacterStudioHubHref } from "@/lib/character-studio-hub";
import { buildMotionReadyCharacterWizardHref } from "@/lib/motion-ready-character-routes";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  resultImageUrl?: string | null;
  sourceImage?: string | null;
  onMakeAnother?: () => void;
};

/** CS12 — post-result actions without opening the editor. */
export function CharacterStudioResultNextSteps({
  resultImageUrl,
  sourceImage,
  onMakeAnother,
}: Props) {
  const t = useActiveTranslator();
  const motionHref = buildMotionReadyCharacterWizardHref({
    sourceImage: sourceImage ?? resultImageUrl ?? undefined,
  });

  return (
    <div
      className={`mt-4 space-y-3 rounded-2xl border p-4 ${studioVisual.editorSurface}`}
      data-testid="character-studio-result-next-steps"
    >
      <p className="text-sm font-semibold text-zinc-900">
        {t("characterStudio.result.nextTitle" as never)}
      </p>
      <div className="flex flex-wrap gap-2">
        {resultImageUrl ?
          <a
            href={resultImageUrl}
            download="character-result.png"
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            data-testid="character-studio-download"
          >
            {t("characterStudio.result.download" as never)}
          </a>
        : null}
        {onMakeAnother ?
          <button
            type="button"
            onClick={onMakeAnother}
            className="rounded-full border border-[#0067B1] bg-[#0067B1]/10 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/20"
            data-testid="character-studio-make-another"
          >
            {t("characterStudio.result.makeAnother" as never)}
          </button>
        : null}
        <Link
          href={motionHref}
          className="rounded-full border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100"
          data-testid="character-studio-motion-ready"
        >
          {t("characterStudio.result.motionReady" as never)}
        </Link>
        <Link
          href={buildCharacterStudioHubHref()}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          {t("characterStudio.result.backToHub" as never)}
        </Link>
      </div>
    </div>
  );
}
