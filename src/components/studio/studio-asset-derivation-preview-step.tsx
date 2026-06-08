"use client";

import { useEffect, useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  applyDerivationTransformCustomTexts,
  applyDerivationTransformToChoices,
  buildDerivationPreview,
  buildDerivationSummaryPrompt,
} from "@/lib/studio-asset-style-dna";
import { transformLabelForChoice } from "@/lib/studio-asset-derivation-choices";
import { syncChoiceDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

export function StudioAssetDerivationPreviewStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();

  const targetKind = (draft.derivationTargetKind ?? draft.kind) as StudioAssetKind;
  const sourceName = draft.derivationSource?.assetName ?? "";
  const styleDna = draft.derivationStyleDna;

  const transformLabel = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const key of [
      "character.chef",
      "character.garden",
      "character.designer",
      "character.community",
      "character.mascot",
      "prop.variant",
      "prop.seasonal",
      "prop.premium",
      "prop.branded",
      "location.variant",
      "location.region",
      "location.timeOfDay",
      "location.mood",
    ]) {
      labels[key] = t(`studio.assetDerivation.transform.${key}` as never);
    }
    return transformLabelForChoice(
      targetKind,
      draft.derivationTransformChoice,
      draft.derivationTransformCustom,
      labels
    );
  }, [targetKind, draft.derivationTransformChoice, draft.derivationTransformCustom, t]);

  const preview = useMemo(() => {
    if (!styleDna || !sourceName) {
      return null;
    }
    return buildDerivationPreview({
      sourceName,
      targetKind,
      transformLabel,
      styleDna,
      preserveLabels: {
        colors: t("studio.assetDerivation.preview.colors"),
        shape: t("studio.assetDerivation.preview.shape"),
        brand: t("studio.assetDerivation.preview.brand"),
        style: t("studio.assetDerivation.preview.style"),
      },
      changeLabels: {
        role: t("studio.assetDerivation.preview.role"),
        accessories: t("studio.assetDerivation.preview.accessories"),
        variant: t("studio.assetDerivation.preview.variant"),
        mood: t("studio.assetDerivation.preview.mood"),
        transformation: t("studio.assetDerivation.preview.transformation"),
      },
    });
  }, [styleDna, sourceName, targetKind, transformLabel, t]);

  useEffect(() => {
    if (!styleDna || !sourceName || !draft.derivationTransformChoice) {
      return;
    }
    const choices = applyDerivationTransformToChoices(
      targetKind,
      draft.derivationTransformChoice,
      draft.derivationTransformCustom
    );
    const customTexts = applyDerivationTransformCustomTexts(
      draft.derivationTransformChoice,
      draft.derivationTransformCustom
    );
    const summaryPrompt = buildDerivationSummaryPrompt({
      targetKind,
      sourceName,
      transformLabel,
      styleDna,
    });
    if (draft.summaryPrompt === summaryPrompt && draft.referenceMode === "generate") {
      return;
    }
    onDraftChange({
      ...syncChoiceDraft(draft, {
        choices,
        customTexts,
        summaryPrompt,
        name: draft.name || preview?.targetLabel || draft.name,
        description: summaryPrompt,
      }),
      referenceMode: "generate",
    });
  }, [
    styleDna,
    sourceName,
    targetKind,
    transformLabel,
    draft.derivationTransformChoice,
    draft.derivationTransformCustom,
    preview?.targetLabel,
    draft.summaryPrompt,
    draft,
    onDraftChange,
  ]);

  if (!preview) {
    return <p className="text-sm text-zinc-600">{t("studio.assetDerivation.preview.incomplete")}</p>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.assetDerivation.preview.basis")}</dt>
          <dd className="mt-0.5 font-semibold text-zinc-900">{preview.sourceLabel}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.assetDerivation.preview.becomes")}</dt>
          <dd className="mt-0.5 font-semibold text-[#0067B1]">{preview.targetLabel}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.assetDerivation.preview.preserves")}</dt>
          <dd className="mt-0.5 text-zinc-800">{preview.preserves.join(" · ")}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.assetDerivation.preview.changes")}</dt>
          <dd className="mt-0.5 text-zinc-800">{preview.changes.join(" · ")}</dd>
        </div>
      </dl>
      {draft.summaryPrompt ?
        <p className="rounded-lg bg-white p-3 text-xs text-zinc-600">{draft.summaryPrompt}</p>
      : null}
    </div>
  );
}
