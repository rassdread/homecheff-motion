"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { mergeAssetIdentityPrefills } from "@/lib/studio-asset-identity-prefill";
import type { AssetPromptPrefillProposal, StudioAssetKind } from "@/types/studio-asset-creation";

type Props = {
  kind: StudioAssetKind;
  promptProposal: AssetPromptPrefillProposal | null;
  imageProposal: AssetPromptPrefillProposal | null;
  onUseMerged: (proposal: AssetPromptPrefillProposal) => void;
};

export function StudioAssetPrefillMergeStep({
  kind,
  promptProposal,
  imageProposal,
  onUseMerged,
}: Props) {
  const t = useActiveTranslator();
  const merged = useMemo(
    () => mergeAssetIdentityPrefills({ kind, promptProposal, imageProposal }),
    [kind, promptProposal, imageProposal]
  );

  if (!promptProposal && !imageProposal) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <h3 className="text-sm font-bold text-zinc-900">{t("studio.assetCreation.merge.title")}</h3>
      <p className="text-xs text-zinc-700">{t("studio.assetCreation.merge.hint")}</p>
      {merged.conflicts && merged.conflicts.length > 0 ?
        <ul className="space-y-2 text-xs text-amber-950">
          {merged.conflicts.map((c) => (
            <li key={c.field} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
              <span className="font-semibold">{c.field}</span>
              <p className="mt-1">
                {t("studio.assetCreation.merge.promptValue", { value: c.promptValue })}
              </p>
              <p>{t("studio.assetCreation.merge.imageValue", { value: c.imageValue })}</p>
            </li>
          ))}
        </ul>
      : <p className="text-xs text-emerald-800">{t("studio.assetCreation.merge.noConflicts")}</p>
      }
      <button
        type="button"
        onClick={() => onUseMerged(merged)}
        className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
      >
        {t("studio.assetCreation.merge.apply")}
      </button>
    </div>
  );
}
