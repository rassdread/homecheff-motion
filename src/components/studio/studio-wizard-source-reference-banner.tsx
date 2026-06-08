"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { hasWizardSourceReference, resolveWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";

type Props = {
  draft: AssetWizardDraft;
};

export function StudioWizardSourceReferenceBanner({ draft }: Props) {
  const t = useActiveTranslator();
  if (!hasWizardSourceReference(draft)) {
    return null;
  }
  const source = resolveWizardSourceReference(draft)!;
  return (
    <div className="rounded-xl border border-[#0067B1]/25 bg-[#0067B1]/5 px-4 py-3 text-sm text-zinc-800">
      <p className="font-semibold text-[#0067B1]">{t("studio.assetCreation.sourceReference.basedOnUpload")}</p>
      <p className="mt-1">{source.sourceReferenceName}</p>
      {source.sourceReferenceImageUrl ?
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source.sourceReferenceImageUrl}
            alt=""
            className="max-h-32 rounded-lg object-contain"
          />
        </div>
      : null}
    </div>
  );
}
