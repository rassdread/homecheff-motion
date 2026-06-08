"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { formatVisionColorsForDisplay } from "@/lib/studio-asset-vision-analysis";
import {
  triggerWizardSourceVisionAnalysis,
  visionAnalysisLoadingPatch,
} from "@/lib/studio-asset-vision-trigger";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  kind: StudioAssetKind;
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mt-2 text-sm text-zinc-900">{children}</div>
    </div>
  );
}

function VisionResults({ analysis }: { analysis: AssetVisionAnalysis }) {
  const t = useActiveTranslator();
  const colorText = formatVisionColorsForDisplay(analysis.colors);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnalysisSection title={t("studio.assetCreation.assetVision.objectType" as never)}>
        {analysis.objectTypeLabel}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.visualStyle" as never)}>
        {analysis.visualStyle || "—"}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.brandColors" as never)}>
        {colorText ?
          <pre className="whitespace-pre-wrap font-sans text-sm">{colorText}</pre>
        : "—"}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.shapeDna" as never)}>
        {analysis.shapeLanguage.length ? analysis.shapeLanguage.join(", ") : "—"}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.keyFeatures" as never)}>
        {analysis.keyFeatures.length ?
          <ul className="list-inside list-disc space-y-1">
            {analysis.keyFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        : "—"}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.brandIdentity" as never)}>
        {analysis.brandIdentity}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.suggestedPreserve" as never)}>
        {analysis.suggestedPreserve.join(", ")}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.suggestedChange" as never)}>
        {analysis.suggestedChange.join(", ")}
      </AnalysisSection>
      <AnalysisSection title={t("studio.assetCreation.assetVision.suggestedForbidden" as never)}>
        {analysis.suggestedForbidden.join(", ")}
      </AnalysisSection>
    </div>
  );
}

export function StudioWizardAssetVisionStep({ kind, draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const jobIdRef = useRef(draft.referenceGenerationId || crypto.randomUUID());
  const startedRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    onDraftChange({
      ...visionAnalysisLoadingPatch(),
      referenceGenerationId: jobIdRef.current,
    });
    const result = await triggerWizardSourceVisionAnalysis({
      draft,
      kind,
      derivationJobId: jobIdRef.current,
    });
    onDraftChange(result.patch);
  }, [draft, kind, onDraftChange]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    if (draft.sourceVisionAnalysisStatus === "ready" || draft.sourceVisionAnalysisStatus === "loading") {
      startedRef.current = true;
      return;
    }
    startedRef.current = true;
    void runAnalysis();
  }, [draft.sourceVisionAnalysisStatus, runAnalysis]);

  const status = draft.sourceVisionAnalysisStatus;

  return (
    <div className="space-y-5">
      <StudioWizardSourceReferenceBanner draft={draft} />

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.assetCreation.assetVision.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.assetVision.lead")}</p>
      </div>

      {status === "loading" ?
        <p className="text-sm font-medium text-zinc-700" role="status">
          {t("studio.assetCreation.assetVision.analyzing")}
        </p>
      : null}

      {status === "failed" ?
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm text-red-800">
            {draft.sourceVisionAnalysisError || t("studio.assetCreation.assetVision.failed")}
          </p>
          <button
            type="button"
            onClick={() => {
              startedRef.current = false;
              void runAnalysis();
            }}
            className="min-h-[40px] rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800"
          >
            {t("studio.assetCreation.assetVision.retry")}
          </button>
        </div>
      : null}

      {status === "ready" && draft.sourceVisionAnalysis ?
        <VisionResults analysis={draft.sourceVisionAnalysis} />
      : null}

      {status === "ready" ?
        <p className="text-sm text-zinc-600">{t("studio.assetCreation.assetVision.confirmHint")}</p>
      : null}
    </div>
  );
}
