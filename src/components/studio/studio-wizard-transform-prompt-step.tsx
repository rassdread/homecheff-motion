"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { fetchAssetReferenceGenerationStatus } from "@/lib/studio-asset-reference-client";
import { formatVisionColorsForDisplay } from "@/lib/studio-asset-vision-analysis";
import { StudioWizardIdentityDebugPanel } from "@/components/studio/studio-wizard-identity-debug-panel";
import { StudioWizardInfoButton } from "@/components/studio/studio-wizard-info-button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  draftPatchForGenerationFailure,
  draftPatchForGenerationStart,
  draftPatchForGenerationSuccess,
  runAssetReferenceGeneration,
} from "@/lib/studio-asset-wizard-reference-generation";
import {
  TRANSFORM_CHANGE_CHIP_IDS,
  TRANSFORM_PRESERVE_CHIP_IDS,
  buildTransformPromptPreview,
  chipActiveInText,
  defaultTransformPreserveText,
  resolveVariantLabelForDraft,
  syncTransformPromptDraft,
  toggleChipInText,
} from "@/lib/studio-asset-transform-prompt";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  kind: StudioAssetKind;
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
  onGenerationComplete: () => void;
  onBack: () => void;
};

function ChipRow({
  labels,
  text,
  labelForId,
  onToggle,
}: {
  labels: readonly string[];
  text: string;
  labelForId: (id: string) => string;
  onToggle: (id: string, active: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((id) => {
        const label = labelForId(id);
        const active = chipActiveInText(text, label);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id, !active)}
            className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-semibold ${
              active
                ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StudioWizardTransformPromptStep({
  kind,
  draft,
  onDraftChange,
  onGenerationComplete,
  onBack,
}: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [generationAvailable, setGenerationAvailable] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [providerDebugError, setProviderDebugError] = useState("");
  const defaultsAppliedRef = useRef(false);

  useEffect(() => {
    void fetchAssetReferenceGenerationStatus().then((res) => {
      setGenerationAvailable(res.ok ? res.data.available : false);
    });
  }, []);

  useEffect(() => {
    if (defaultsAppliedRef.current) {
      return;
    }
    if (
      draft.sourceTransformPreserve.trim() &&
      draft.sourceTransformChange.trim() &&
      draft.sourceTransformForbidden.trim()
    ) {
      defaultsAppliedRef.current = true;
      return;
    }
    defaultsAppliedRef.current = true;
    const variant = resolveVariantLabelForDraft(draft);
    const vision = draft.sourceVisionAnalysis;
    const preserveDefault =
      draft.sourceTransformPreserve ||
      (vision ? vision.suggestedPreserve.join(", ") : "") ||
      defaultTransformPreserveText();
    const changeDefault =
      draft.sourceTransformChange ||
      (vision ? vision.suggestedChange.join(", ") : "") ||
      variant;
    const forbiddenDefault =
      draft.sourceTransformForbidden ||
      (vision ? vision.suggestedForbidden.join(", ") : "");
    onDraftChange({
      sourceTransformPreserve: preserveDefault,
      sourceTransformChange: changeDefault,
      sourceTransformForbidden: forbiddenDefault,
      ...syncTransformPromptDraft({
        ...draft,
        sourceTransformPreserve: preserveDefault,
        sourceTransformChange: changeDefault,
        sourceTransformForbidden: forbiddenDefault,
      }),
    });
  }, [draft, onDraftChange]);

  const preview = useMemo(() => buildTransformPromptPreview(draft), [draft]);

  const labelForPreserve = useCallback(
    (id: string) => t(`studio.assetCreation.transformPrompt.preserve.${id}` as never),
    [t]
  );
  const labelForChange = useCallback(
    (id: string) => t(`studio.assetCreation.transformPrompt.change.${id}` as never),
    [t]
  );

  const patchField = (patch: Partial<AssetWizardDraft>) => {
    onDraftChange((d) => ({ ...d, ...patch, ...syncTransformPromptDraft({ ...d, ...patch }) }));
  };

  const handleGenerate = async () => {
    if (generating || generationAvailable === false) {
      return;
    }
    setGenerating(true);
    setProviderDebugError("");
    const generationId = draft.referenceGenerationId || crypto.randomUUID();
    onDraftChange(draftPatchForGenerationStart(draft, generationId));

    const { outcome } = await runAssetReferenceGeneration({
      draft: { ...draft, ...syncTransformPromptDraft(draft) },
      kind,
    });

    setGenerating(false);

    if (!outcome.ok) {
      if (outcome.providerMessage) {
        setProviderDebugError(outcome.providerMessage);
      }
      onDraftChange({
        ...draftPatchForGenerationFailure(
          outcome.errorKey ? t(outcome.errorKey as never) : outcome.error
        ),
      });
      return;
    }

    onDraftChange(draftPatchForGenerationSuccess(outcome));
    onGenerationComplete();
  };

  return (
    <div className="space-y-5">
      <StudioWizardSourceReferenceBanner draft={draft} />

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          {t("studio.assetCreation.transformPrompt.title")}
          <StudioWizardInfoButton infoKey="studio.workbench.info.preserveChangeForbidden" />
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.transformPrompt.lead")}</p>
      </div>

      {draft.sourceVisionAnalysis ?
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm">
          <p className="font-semibold text-zinc-900">
            {t("studio.assetCreation.transformPrompt.visionSummaryTitle")}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.assetVision.objectType")}
              </dt>
              <dd>{draft.sourceVisionAnalysis.objectTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.assetVision.visualStyle")}
              </dt>
              <dd>{draft.sourceVisionAnalysis.visualStyle || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.assetVision.brandIdentity")}
              </dt>
              <dd>{preview.brandIdentity || draft.sourceVisionAnalysis.brandIdentity}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.assetVision.assetFamily")}
              </dt>
              <dd>{preview.assetFamily || draft.sourceVisionAnalysis.assetFamily || "—"}</dd>
            </div>
            {preview.identityFingerprintSummary ?
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.assetCreation.assetVision.identityFingerprint")}
                </dt>
                <dd>{preview.identityFingerprintSummary}</dd>
              </div>
            : null}
            {draft.sourceVisionAnalysis.colors.length ?
              <div>
                <dt className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.assetCreation.assetVision.brandColors")}
                </dt>
                <dd className="whitespace-pre-wrap">
                  {formatVisionColorsForDisplay(draft.sourceVisionAnalysis.colors)}
                </dd>
              </div>
            : null}
          </dl>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.transformPrompt.preserveLabel")}
              </dt>
              <dd>{draft.sourceTransformPreserve || draft.sourceVisionAnalysis.suggestedPreserve.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.transformPrompt.changeLabel")}
              </dt>
              <dd>{draft.sourceTransformChange || draft.sourceVisionAnalysis.suggestedChange.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.transformPrompt.forbiddenLabel")}
              </dt>
              <dd>{draft.sourceTransformForbidden || draft.sourceVisionAnalysis.suggestedForbidden.join(", ")}</dd>
            </div>
          </dl>
        </div>
      : null}

      <label className="block text-sm font-medium text-zinc-800">
        {t("studio.assetCreation.transformPrompt.instructionLabel")}
        <textarea
          className="mt-2 min-h-[96px] w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          value={draft.sourceTransformInstruction}
          onChange={(e) => patchField({ sourceTransformInstruction: e.target.value })}
          placeholder={t("studio.assetCreation.transformPrompt.instructionPlaceholder")}
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-800">{t("studio.assetCreation.transformPrompt.preserveLabel")}</p>
        <ChipRow
          labels={TRANSFORM_PRESERVE_CHIP_IDS}
          text={draft.sourceTransformPreserve}
          labelForId={labelForPreserve}
          onToggle={(id, active) => {
            patchField({
              sourceTransformPreserve: toggleChipInText(
                draft.sourceTransformPreserve,
                labelForPreserve(id),
                active
              ),
            });
          }}
        />
        <textarea
          className="min-h-[64px] w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          value={draft.sourceTransformPreserve}
          onChange={(e) => patchField({ sourceTransformPreserve: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-800">{t("studio.assetCreation.transformPrompt.changeLabel")}</p>
        <ChipRow
          labels={TRANSFORM_CHANGE_CHIP_IDS}
          text={draft.sourceTransformChange}
          labelForId={labelForChange}
          onToggle={(id, active) => {
            patchField({
              sourceTransformChange: toggleChipInText(
                draft.sourceTransformChange,
                labelForChange(id),
                active
              ),
            });
          }}
        />
        <textarea
          className="min-h-[64px] w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          value={draft.sourceTransformChange}
          onChange={(e) => patchField({ sourceTransformChange: e.target.value })}
        />
      </div>

      <label className="block text-sm font-medium text-zinc-800">
        {t("studio.assetCreation.transformPrompt.forbiddenLabel")}
        <textarea
          className="mt-2 min-h-[72px] w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          value={draft.sourceTransformForbidden}
          onChange={(e) => patchField({ sourceTransformForbidden: e.target.value })}
          placeholder={t("studio.assetCreation.transformPrompt.forbiddenPlaceholder")}
        />
      </label>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm">
        <p className="font-semibold text-zinc-900">{t("studio.assetCreation.transformPrompt.previewTitle")}</p>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">{t("studio.assetCreation.transformPrompt.previewBasis")}</dt>
            <dd className="text-zinc-800">{preview.sourceName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">{t("studio.assetCreation.transformPrompt.previewBecomes")}</dt>
            <dd className="text-zinc-800">{preview.variantLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">{t("studio.assetCreation.transformPrompt.previewPreserve")}</dt>
            <dd className="text-zinc-800">{preview.preserve}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-zinc-500">{t("studio.assetCreation.transformPrompt.previewChange")}</dt>
            <dd className="text-zinc-800">{preview.change}</dd>
          </div>
          {preview.forbidden ?
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">{t("studio.assetCreation.transformPrompt.previewForbidden")}</dt>
              <dd className="text-zinc-800">{preview.forbidden}</dd>
            </div>
          : null}
        </dl>
        <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-relaxed text-zinc-600">{preview.compactPrompt}</p>
      </div>

      <StudioWizardIdentityDebugPanel
        draft={draft}
        preview={preview}
        showFullPrompt={session.user?.role === "admin"}
      />

      {generationAvailable === false ?
        <p className="text-sm text-amber-700">{t("studio.assetCreation.reference.generateUnavailable")}</p>
      : null}
      {providerDebugError ?
        <p className="text-xs text-zinc-500">{providerDebugError}</p>
      : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold sm:flex-none"
        >
          {t("studio.assetCreation.wizard.back")}
        </button>
        <button
          type="button"
          disabled={generating || generationAvailable === false}
          onClick={() => void handleGenerate()}
          className="min-h-[48px] flex-1 rounded-full bg-[#0067B1] px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none"
        >
          {generating
            ? t("studio.assetCreation.reference.generating")
            : t("studio.assetCreation.transformPrompt.generateVariant")}
        </button>
      </div>
    </div>
  );
}
