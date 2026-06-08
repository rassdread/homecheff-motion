"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioWizardChoiceGrid } from "@/components/studio/studio-wizard-choice-grid";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  analyzeAssetStyleDnaApi,
  recordAssetDerivationAcceptApi,
} from "@/lib/studio-asset-derivation-client";
import {
  fetchAssetReferenceGenerationStatus,
  generateStudioAssetReferenceApi,
} from "@/lib/studio-asset-reference-client";
import { transformLabelForChoice } from "@/lib/studio-asset-derivation-choices";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  clearWizardGeneratedReferenceOutput,
  hasWizardSourceReference,
  recordWizardSourceReference,
  resolveWizardSourceReference,
} from "@/lib/studio-asset-wizard-source-reference";
import {
  resolveTransformLabelForGeneration,
  shouldSkipReferenceModeChoice,
} from "@/lib/studio-asset-wizard-source-flow";
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
};

export function StudioWizardReferenceStep({
  kind,
  draft,
  onDraftChange,
  onBackToChoices,
  onBackToSourceTransform,
  onChangeSource,
}: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generationAvailable, setGenerationAvailable] = useState<boolean | null>(null);
  const [providerDebugError, setProviderDebugError] = useState("");
  const generateStartedRef = useRef(false);

  const referenceMode = draft.referenceMode;
  const referenceImageUrl = draft.referenceImageUrl;
  const previewUrl = draft.generatedReferencePreviewUrl || referenceImageUrl;
  const sourceFlow = shouldSkipReferenceModeChoice(draft);
  const source = resolveWizardSourceReference(draft);

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

  const resolveTransformLabel = useCallback(() => {
    const fromFlow = resolveTransformLabelForGeneration(draft);
    if (fromFlow) {
      return fromFlow;
    }
    if (!draft.derivationTransformChoice) {
      return undefined;
    }
    const labels: Record<string, string> = {};
    const choiceId = draft.derivationTransformChoice;
    const prefix =
      kind === "character" ? "character."
      : kind === "prop" ? "prop."
      : "location.";
    labels[`${prefix}${choiceId}`] = t(
      `studio.assetDerivation.transform.${prefix}${choiceId}` as never
    );
    return transformLabelForChoice(
      kind,
      choiceId,
      draft.derivationTransformCustom,
      labels
    );
  }, [draft.derivationTransformChoice, draft.derivationTransformCustom, kind, t]);

  const runGeneration = useCallback(
    async (forceNewId = false) => {
      const generationId =
        forceNewId || !draft.referenceGenerationId
          ? crypto.randomUUID()
          : draft.referenceGenerationId;

      setProviderDebugError("");
      onDraftChange((d) => ({
        ...d,
        ...clearWizardGeneratedReferenceOutput(d),
        referenceGenerationStatus: "generating",
        referenceGenerationError: "",
        referenceGenerationId: generationId,
      }));

      const source = resolveWizardSourceReference(draft);
      let styleDna = draft.derivationStyleDna;
      let derivationSource = draft.derivationSource;

      if (source && !styleDna && source.sourceReferenceImageUrl) {
        const analyze = await analyzeAssetStyleDnaApi({
          imageUrl: source.sourceReferenceImageUrl,
          sourceKind: draft.derivationTargetKind ?? kind,
          sourceName: source.sourceReferenceName,
          derivationJobId: generationId,
        });
        if (analyze.ok) {
          styleDna = analyze.data.styleDna;
          if (!derivationSource) {
            derivationSource = {
              sourceType: "upload",
              sourceKind: draft.derivationTargetKind ?? kind,
              assetId: null,
              assetName: source.sourceReferenceName,
              referenceImageUrl: source.sourceReferenceImageUrl,
              referenceStorageKey: source.sourceReferenceStorageKey,
            };
          }
          onDraftChange({
            derivationStyleDna: styleDna,
            derivationStyleDnaStatus: "ready",
            derivationSource,
          });
        }
      }

      const transformLabel = resolveTransformLabel();
      const userPrompt =
        draft.sourceTransformCustom.trim() ||
        (draft.sourceTransformChoice === "custom" ? "" : undefined);
      const sourceReference =
        source ?
          {
            name: source.sourceReferenceName,
            imageUrl: source.sourceReferenceImageUrl,
            transformLabel,
            userPrompt: userPrompt || undefined,
          }
        : undefined;

      const res = await generateStudioAssetReferenceApi({
        kind,
        summaryPrompt: draft.summaryPrompt,
        choices: draft.choices,
        customTexts: draft.customTexts,
        generationId,
        sourceReference,
        derivation:
          styleDna && (derivationSource || source)
            ? {
                styleDna,
                sourceName: derivationSource?.assetName ?? source!.sourceReferenceName,
                sourceKind: derivationSource?.sourceKind ?? kind,
                sourceAssetId: derivationSource?.assetId,
              }
            : undefined,
      });

      if (!res.ok) {
        const data = res.data as { error?: string; providerMessage?: string | null };
        const errorKey = data.error?.startsWith("studio.") ? data.error : null;
        if (data.providerMessage) {
          setProviderDebugError(data.providerMessage);
        }
        onDraftChange({
          referenceGenerationStatus: "failed",
          referenceGenerationError:
            errorKey ?
              t(errorKey as never)
            : data.error ?? t("studio.assetCreation.reference.generateFailedUser"),
        });
        return;
      }

      onDraftChange({
        referenceGenerationStatus: "preview",
        generatedReferencePreviewUrl: res.data.referenceImageUrl,
        generatedReferenceStorageKey: res.data.referenceStorageKey,
        referenceGenerationPrompt: res.data.generatedPrompt,
      });
    },
    [draft, kind, onDraftChange, resolveTransformLabel, t]
  );

  useEffect(() => {
    if (
      referenceMode === "generate" &&
      generationAvailable &&
      draft.referenceGenerationStatus === "idle" &&
      draft.summaryPrompt.trim() &&
      !generateStartedRef.current
    ) {
      generateStartedRef.current = true;
      void runGeneration();
    }
    if (referenceMode !== "generate") {
      generateStartedRef.current = false;
    }
  }, [referenceMode, generationAvailable, draft.referenceGenerationStatus, draft.summaryPrompt, runGeneration]);

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
    generateStartedRef.current = false;
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
        <div className="rounded-xl border border-[#0067B1]/25 bg-[#0067B1]/5 px-4 py-3">
          <p className="text-sm font-semibold text-[#0067B1]">
            {t("studio.assetCreation.sourceTransform.usingAsBasis")}
          </p>
          <p className="mt-1 text-sm text-zinc-700">{t("studio.assetCreation.reference.preserveStyleHint")}</p>
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
          {sourceFlow && !draft.summaryPrompt.trim() ?
            <p className="text-sm text-amber-700">
              {t("studio.assetCreation.sourceTransform.summaryRequired")}
            </p>
          : null}
          {draft.referenceGenerationStatus === "generating" ?
            <div className="space-y-3" role="status" aria-live="polite">
              <div className="h-48 animate-pulse rounded-xl bg-zinc-200" />
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
                  onClick={() => void runGeneration(true)}
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
