"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { buildMediaAssetDirectorPlan } from "@/lib/studio-media-asset-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
};

export function StudioStoryboardMediaAssetPanel({ storyboard }: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildMediaAssetDirectorPlan(storyboard), [storyboard]);

  if (plan.characterBundles.length === 0 && plan.assets.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{t("studio.mediaAsset.storyboardTitle")}</h3>
      <p className="mt-1 text-xs text-slate-600">{plan.registrySummary}</p>
      <p className="mt-1 text-xs text-slate-700">
        {t("studio.mediaAsset.validationScore", { score: String(plan.validationScore) })}
      </p>

      {plan.characterBundles.length > 0 ?
        <ul className="mt-3 space-y-2 text-xs text-slate-800">
          {plan.characterBundles.map((bundle) => (
            <li key={bundle.characterId} className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
              <p className="font-semibold">{bundle.characterName}</p>
              <p className="mt-0.5 text-slate-600">
                {t("studio.mediaAsset.characterLinks", {
                  refs: String(bundle.referenceImages.length),
                  mouths: String(bundle.mouthAssets.length),
                  voices: String(bundle.voiceAssets.length),
                })}
              </p>
            </li>
          ))}
        </ul>
      : null}

      {plan.warnings.length > 0 ?
        <ul className="mt-3 space-y-1 text-xs text-amber-900">
          {plan.warnings.slice(0, 4).map((w, i) => (
            <li key={`${w.code}-${i}`}>{t(w.messageKey as never, w.params as never)}</li>
          ))}
        </ul>
      : null}

      <Link
        href="/studio/assets"
        className="mt-3 inline-block text-xs font-semibold text-[#006D52] hover:underline"
      >
        {t("studio.mediaAsset.openLibrary")} →
      </Link>
    </section>
  );
}
