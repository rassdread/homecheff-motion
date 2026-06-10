"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorAssetProfile } from "@/types/editor-asset-profile";

type Props = {
  profile: EditorAssetProfile;
  onAction: (actionId: string, prompt?: string) => void;
};

export function EditorAssetRecommendationsPanel({ profile, onAction }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/5 to-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
        {t("editor.assetIntel.recommendedTitle" as never)}
      </p>
      <p className="mt-1 text-sm text-slate-700">{t(profile.humanSummaryKey as never)}</p>
      <p className="mt-2 text-xs text-slate-500">
        {t("editor.assetIntel.whereGoes" as never)}: {t(profile.libraryIntelligence.sectionKey as never)}
      </p>

      <ul className="mt-3 space-y-2">
        {profile.recommendedActions.map((rec) => (
          <li key={rec.id}>
            <button
              type="button"
              onClick={() => onAction(rec.id, rec.prompt)}
              className="flex w-full flex-col rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left hover:border-[#0067B1]/40 hover:bg-[#0067B1]/5"
            >
              <span className="text-sm font-semibold text-slate-900">{t(rec.labelKey as never)}</span>
              <span className="mt-0.5 text-xs text-slate-500">{t(rec.reasonKey as never)}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
          {t(profile.recommendedMotionUse.labelKey as never)}
        </span>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-800">
          {t(profile.recommendedStudioUse.labelKey as never)}
        </span>
      </div>

      {profile.variantGroup && profile.variantGroup.variants.length > 1 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600">
            {t("editor.assetIntel.variantsTitle" as never)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {profile.variantGroup.variants.slice(0, 5).map((variant) => (
              <span
                key={variant.id}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-slate-600"
              >
                {t(variant.labelKey as never)}
              </span>
            ))}
          </div>
        </div>
      : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/studio/storyboards/new?editorSession=${encodeURIComponent(profile.studioIntent.editorSessionId)}`}
          className="text-xs font-semibold text-[#0067B1] hover:underline"
        >
          {t("suite.flow.useInStudio")}
        </Link>
        <Link
          href={`/animate/instant?editorSession=${encodeURIComponent(profile.studioIntent.editorSessionId)}`}
          className="text-xs font-semibold text-[#0067B1] hover:underline"
        >
          {t("suite.flow.animateInMotion")}
        </Link>
      </div>
    </div>
  );
}
