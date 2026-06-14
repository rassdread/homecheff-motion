"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioWizardChoiceGrid } from "@/components/studio/studio-wizard-choice-grid";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { recordAssetDerivationAcceptApi } from "@/lib/studio-asset-derivation-client";
import { fetchAssetReferenceGenerationStatus } from "@/lib/studio-asset-reference-client";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  draftPatchForGenerationFailure,
  draftPatchForGenerationStart,
  draftPatchForGenerationSuccess,
  runAssetReferenceGeneration,
} from "@/lib/studio-asset-wizard-reference-generation";
import { buildTransformPromptPreview } from "@/lib/studio-asset-transform-prompt";
import { StudioWizardIdentityDebugPanel } from "@/components/studio/studio-wizard-identity-debug-panel";
import { StudioCharacterCreationPipelinePanel } from "@/components/studio/studio-character-creation-pipeline-panel";
import { StudioWizardGenerationProgress } from "@/components/studio/studio-wizard-generation-progress";
import { StudioVariantQualityPanel } from "@/components/studio/studio-variant-quality-panel";
import {
  clearWizardGeneratedReferenceOutput,
  hasWizardSourceReference,
  recordWizardSourceReference,
  resolveWizardSourceReference,
} from "@/lib/studio-asset-wizard-source-reference";
import { shouldSkipReferenceModeChoice } from "@/lib/studio-asset-wizard-source-flow";
import type { AssetReferenceMode } from "@/types/studio-asset-creation";
import type { WizardChoiceStepDef } from "@/lib/studio-asset-wizard-choices";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

const REFERENCE_CHOICE_DEF: WizardChoiceStepDef = {
  id: "reference_mode",
  titleKey: "studio.assetCreation.reference.title",
  hintKey: "studio.assetCreation.reference.hint",
  options: [
    {
      id: "upload",
      labelKey: "studio.assetCreation.reference.upload",
      emoji: "📤",
    },
    {
      id: "generate",
      labelKey: "studio.assetCreation.reference.generate",
      emoji: "✨",
    },
    {
      id: "skip",
      labelKey: "studio.assetCreation.reference.skip",
      emoji: "⏭️",
    },
  ],
};

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  kind: StudioAssetKind;
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
  onBackToChoices: () => void;
  onBackToSourceTransform?: () => void;
  onChangeSource?: () => void;
  storyboardId?: string | null;
  decisionId?: string | null;
};

export function StudioWizardReferenceStep({
  kind,
  draft,
  onDraftChange,
  onBackToChoices,
  onBackToSourceTransform,
  onChangeSource,
  storyboardId = null,
  decisionId = null,
}: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generationAvailable, setGenerationAvailable] = useState<boolean | null>(null);
  const [providerDebugError, setProviderDebugError] = useState("");

  const referenceMode = draft.referenceMode;
  const referenceImageUrl = draft.referenceImageUrl;
  const previewUrl = draft.generatedReferencePreviewUrl || referenceImageUrl;
  const sourceFlow = shouldSkipReferenceModeChoice(draft) || hasWizardSourceReference(draft);
  const source = resolveWizardSourceReference(draft);
  const identityPreview = useMemo(
    () => (sourceFlow ? buildTransformPromptPreview(draft) : null),
    [draft, sourceFlow]
  );

  useEffect(() => {
    if (sourceFlow && referenceMode !== "generate") {
      queueMicrotask(() => {
        onDraftChange({ referenceMode: "generate" });
      });
    }
  }, [sourceFlow, referenceMode, onDraftChange]);

  useEffect(() => {
    void fetchAssetReferenceGenerationStatus().then((res) => {
      if (res.ok) {
        setGenerationAvailable(res.data.available);
      } else {
        setGenerationAvailable(false);
      }
    });
  }, []);

  const runGeneration = useCallback(
    async (forceNewId = false) => {
      setProviderDebugError("");
      const generationId =
        forceNewId || !draft.referenceGenerationId
          ? crypto.randomUUID()
          : draft.referenceGenerationId;

      onDraftChange(draftPatchForGenerationStart(draft, generationId));

      const { outcome } = await runAssetReferenceGeneration({
        draft,
        kind,
        forceNewId,
      });

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
    },
    [draft, kind, onDraftChange, t]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      try {
        const { optimizedBlob, thumbnailBlob, mimeType } = await preprocessImageFile(
          file,
          getClientImagePreprocessOptionsForRole("studio_reference")
        );
        const clientUploadId = crypto.randomUUID();
        const formData = new FormData();
        formData.set("workingImage", optimizedBlob, "working.jpg");
        formData.set("thumbnailImage", thumbnailBlob, "thumb.jpg");
        formData.set("originalFileName", file.name);
        formData.set("mimeType", mimeType);
        formData.set("sizeBytes", String(file.size));
        formData.set("clientUploadId", clientUploadId);
        const uploaded = await postWizardImageUpload(formData);
        const sourcePatch = recordWizardSourceReference({
          imageUrl: uploaded.workingImageUrl,
          storageKey: uploaded.workingStorageKey,
          name: file.name.replace(/\.[^.]+$/, ""),
        });
        onDraftChange({
          ...sourcePatch,
          referenceImageUrl: uploaded.workingImageUrl,
          referenceStorageKey: uploaded.workingStorageKey,
          referenceGenerationStatus: "accepted",
        });
      } catch (e) {
        setUploadError(
          e instanceof ImageUploadError ? e.message : t("studio.assetCreation.input.uploadFailed")
        );
      } finally {
        setUploading(false);
      }
    },
    [onDraftChange, t]
  );

  const handleModeChange = (mode: AssetReferenceMode) => {
    onDraftChange((d) => ({
      ...d,
      referenceMode: mode,
      ...clearWizardGeneratedReferenceOutput({ ...d, referenceMode: mode }),
    }));
  };

  const acceptGenerated = () => {
    if (
      draft.derivationFlow &&
      draft.derivationSource &&
      draft.referenceGenerationId
    ) {
      void recordAssetDerivationAcceptApi({
        derivationJobId: draft.referenceGenerationId,
        sourceKind: draft.derivationSource.sourceKind,
        targetKind: kind,
        sourceAssetId: draft.derivationSource.assetId,
        sourceAssetName: draft.derivationSource.assetName,
      });
    }
    onDraftChange({
      referenceImageUrl: draft.generatedReferencePreviewUrl,
      referenceStorageKey: draft.generatedReferenceStorageKey,
      referenceGenerationStatus: "accepted",
      derivationAccepted: draft.derivationFlow ? true : draft.derivationAccepted,
    });
  };

  const disabledGenerate = generationAvailable === false;

  return (
    <div className="space-y-4">
      <StudioWizardSourceReferenceBanner draft={draft} />

      {sourceFlow ?
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {t("studio.assetCreation.sourceTransform.reviewVariant")}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.transformPrompt.reviewLead")}</p>
          </div>
        </div>
      : (
        <StudioWizardChoiceGrid
          def={REFERENCE_CHOICE_DEF}
          selectedId={referenceMode}
          customText=""
          onSelect={(id) => handleModeChange(id as AssetReferenceMode)}
          onCustomTextChange={() => {}}
          disabledOptionIds={disabledGenerate ? ["generate"] : []}
          disabledHintKey={
            disabledGenerate ? "studio.assetCreation.reference.generateUnavailable" : undefined
          }
        />
      )}

      {!sourceFlow && referenceMode === "upload" ?
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="min-h-[48px] w-full rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
          >
            {uploading
              ? t("button.loading")
              : referenceImageUrl
                ? t("studio.assetCreation.reference.replaceUpload")
                : t("studio.assetCreation.reference.chooseFile")}
          </button>
          {uploadError ?
            <p className="text-sm text-red-700">{uploadError}</p>
          : null}
          {referenceImageUrl ?
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referenceImageUrl}
                alt=""
                className="max-h-64 w-full rounded-xl object-contain"
              />
              <p className="text-xs font-medium text-emerald-700">
                {t("studio.assetCreation.reference.assigned")}
              </p>
            </div>
          : null}
        </div>
      : null}

      {(sourceFlow || referenceMode === "generate") ?
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          {sourceFlow && draft.referenceGenerationStatus === "idle" ?
            <p className="text-sm text-amber-700">
              {t("studio.assetCreation.transformPrompt.completePromptFirst")}
            </p>
          : null}

          {kind === "character" && generationAvailable !== false ?
            <StudioCharacterCreationPipelinePanel
              draft={{ ...draft, kind: "character" }}
              onDraftChange={onDraftChange}
              storyboardId={storyboardId}
              decisionId={decisionId}
              showRecent={false}
            />
          : (
            <>
              {!sourceFlow &&
              draft.referenceGenerationStatus === "idle" &&
              generationAvailable &&
              draft.summaryPrompt.trim() ?
                <button
                  type="button"
                  onClick={() => void runGeneration()}
                  className="min-h-[48px] w-full rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
                >
                  {t("studio.assetCreation.transformPrompt.generateVariant")}
                </button>
              : null}

              {draft.referenceGenerationStatus === "generating" ?
                <div className="space-y-3" role="status" aria-live="polite">
                  <StudioWizardGenerationProgress activeStepId="generate_image" />
                  <p className="text-center text-sm font-medium text-zinc-700">
                    {t("studio.assetCreation.reference.generating")}
                  </p>
                </div>
              : null}

              {draft.referenceGenerationStatus === "failed" ?
                <div className="space-y-3">
                  <p className="text-sm text-red-700">{draft.referenceGenerationError}</p>
                  {session.user?.role === "admin" && providerDebugError ?
                    <p className="text-xs text-zinc-500">{providerDebugError}</p>
                  : null}
                  <button
                    type="button"
                    onClick={() => void runGeneration(true)}
                    className="min-h-[48px] w-full rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t("studio.assetCreation.reference.retryGenerate")}
                  </button>
                </div>
              : null}
            </>
          )}

          {(draft.referenceGenerationStatus === "preview" ||
            draft.referenceGenerationStatus === "accepted") &&
          previewUrl ?
            <div className="space-y-4">
              {sourceFlow && source?.sourceReferenceImageUrl ?
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                      {t("studio.assetCreation.sourceTransform.reviewSource")}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={source.sourceReferenceImageUrl}
                      alt=""
                      className="max-h-64 w-full rounded-xl border border-zinc-200 object-contain bg-white"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                      {t("studio.assetCreation.sourceTransform.reviewVariant")}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt=""
                      className="max-h-64 w-full rounded-xl object-contain shadow-sm bg-white"
                    />
                  </div>
                </div>
              : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-80 w-full rounded-xl object-contain shadow-sm"
                />
              )}
              {draft.summaryPrompt ?
                <p className="text-sm text-zinc-700">{draft.summaryPrompt}</p>
              : null}
              {draft.variantIdentityAudit ?
                <StudioVariantQualityPanel
                  audit={draft.variantIdentityAudit}
                  placementQa={draft.placementQaResult}
                  onRegenerate={() => {
                    onDraftChange({
                      variantRegenerationStrict: true,
                    });
                    void runGeneration(true);
                  }}
                  onViewPrompt={onBackToSourceTransform}
                  onAcceptAnyway={acceptGenerated}
                />
              : draft.variantFidelityScore ?
                <div
                  className={`rounded-xl border p-3 text-sm ${
                    draft.variantFidelityScore.recoveryTier === "identity_failure"
                      ? "border-red-300 bg-red-50 text-red-900"
                      : draft.variantFidelityScore.lowFidelity
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  <p className="font-semibold">
                    {t("studio.assetCreation.reference.fidelityTitle")} —{" "}
                    {draft.variantFidelityScore.overall}%
                  </p>
                </div>
              : null}
              {identityPreview ?
                <StudioWizardIdentityDebugPanel
                  draft={draft}
                  preview={identityPreview}
                  generatedPrompt={draft.referenceGenerationPrompt}
                  showFullPrompt={session.user?.role === "admin"}
                />
              : null}
              <p className="text-sm font-medium text-zinc-800">
                {t("studio.assetCreation.reference.useOfficialQuestion")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  disabled={draft.referenceGenerationStatus === "accepted"}
                  onClick={acceptGenerated}
                  className="min-h-[48px] rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {draft.referenceGenerationStatus === "accepted"
                    ? t("studio.assetCreation.reference.assigned")
                    : t("studio.assetCreation.reference.useOfficial")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange({
                      variantRegenerationStrict:
                        draft.variantFidelityScore?.lowFidelity ?? draft.variantRegenerationStrict,
                    });
                    void runGeneration(true);
                  }}
                  className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  {t("studio.assetCreation.reference.regenerate")}
                </button>
                {onBackToSourceTransform ?
                  <button
                    type="button"
                    onClick={onBackToSourceTransform}
                    className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
                  >
                    {t("studio.assetCreation.sourceTransform.editPrompt")}
                  </button>
                : null}
                {onChangeSource ?
                  <button
                    type="button"
                    onClick={onChangeSource}
                    className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
                  >
                    {t("studio.assetCreation.sourceTransform.changeSource")}
                  </button>
                : (
                  <button
                    type="button"
                    onClick={onBackToChoices}
                    className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
                  >
                    {t("studio.assetCreation.reference.backToChoices")}
                  </button>
                )}
              </div>
            </div>
          : null}

          {!sourceFlow && draft.referenceGenerationStatus === "idle" && generationAvailable && !draft.summaryPrompt.trim() ?
            <p className="text-sm text-amber-700">
              {t("studio.assetCreation.reference.summaryRequired")}
            </p>
          : null}
        </div>
      : null}

      {!sourceFlow && referenceMode === "skip" ?
        <p className="text-sm text-zinc-600">{t("studio.assetCreation.reference.skipHint")}</p>
      : null}
    </div>
  );
}
