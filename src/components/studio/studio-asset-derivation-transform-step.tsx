"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioWizardChoiceGrid } from "@/components/studio/studio-wizard-choice-grid";
import { useActiveTranslator } from "@/i18n/client";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import { DERIVATION_TARGET_KIND_DEF } from "@/lib/studio-asset-derivation-choices";
import { buildDerivationTransformDef } from "@/lib/studio-asset-transformation-options";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  step: "derive_target_kind" | "derive_transform";
  onDraftChange: (patch: DraftPatch) => void;
};

export function StudioAssetDerivationTransformStep({ draft, step, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);

  useEffect(() => {
    void fetchAssetDerivationSources().then((res) => {
      if (res.ok) {
        setSources(res.data.sources);
      }
    });
  }, []);

  const targetKind = draft.derivationTargetKind ?? draft.kind;
  const transformDef = useMemo(
    () => buildDerivationTransformDef(targetKind, sources),
    [targetKind, sources]
  );

  if (step === "derive_target_kind") {
    return (
      <StudioWizardChoiceGrid
        def={DERIVATION_TARGET_KIND_DEF}
        selectedId={draft.derivationTargetKind}
        customText=""
        onSelect={(id) => {
          const targetKind = id as StudioAssetKind;
          onDraftChange({
            derivationTargetKind: targetKind,
            kind: targetKind,
            derivationTransformChoice: "",
            derivationTransformCustom: "",
          });
        }}
        onCustomTextChange={() => {}}
      />
    );
  }

  const def = transformDef;

  if (!def) {
    return <p className="text-sm text-zinc-600">{t("studio.assetDerivation.transform.unsupported")}</p>;
  }

  return (
    <StudioWizardChoiceGrid
      def={def}
      selectedId={draft.derivationTransformChoice}
      customText={draft.derivationTransformCustom}
      onSelect={(id) => onDraftChange({ derivationTransformChoice: id })}
      onCustomTextChange={(text) => onDraftChange({ derivationTransformCustom: text })}
    />
  );
}
