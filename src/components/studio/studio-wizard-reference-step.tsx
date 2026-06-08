"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioWizardChoiceGrid } from "@/components/studio/studio-wizard-choice-grid";
import { useActiveTranslator } from "@/i18n/client";
import {
  fetchAssetReferenceGenerationStatus,
  generateStudioAssetReferenceApi,
} from "@/lib/studio-asset-reference-client";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
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
};

export function StudioWizardReferenceStep({ kind, draft, onDraftChange, onBackToChoices }: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generationAvailable, setGenerationAvailable] = useState<boolean | null>(null);
  const generateStartedRef = useRef(false);

  const referenceMode = draft.referenceMode;
  const referenceImageUrl = draft.referenceImageUrl;
  const previewUrl = draft.generatedReferencePreviewUrl || referenceImageUrl;

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
      const generationId =
        forceNewId || !draft.referenceGenerationId
          ? crypto.randomUUID()
          : draft.referenceGenerationId;

      onDraftChange({
        referenceGenerationStatus: "generating",
        referenceGenerationError: "",
        referenceGenerationId: generationId,
        generatedReferencePreviewUrl: "",
        generatedReferenceStorageKey: "",
        referenceImageUrl: "",
        referenceStorageKey: "",
      });

      const res = await generateStudioAssetReferenceApi({
        kind,
        summaryPrompt: draft.summaryPrompt,
        choices: draft.choices,
        customTexts: draft.customTexts,
        generationId,
      });

      if (!res.ok) {
        onDraftChange({
          referenceGenerationStatus: "failed",
          referenceGenerationError:
            (res.data as { error?: string }).error ?? t("studio.assetCreation.reference.generateFailed"),
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
    [draft, kind, onDraftChange, t]
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
        onDraftChange({
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
    onDraftChange({
      referenceMode: mode,
      referenceImageUrl: "",
      referenceStorageKey: "",
      referenceGenerationStatus: "idle",
      referenceGenerationError: "",
      generatedReferencePreviewUrl: "",
      generatedReferenceStorageKey: "",
      referenceGenerationPrompt: "",
    });
    generateStartedRef.current = false;
  };

  const acceptGenerated = () => {
    onDraftChange({
      referenceImageUrl: draft.generatedReferencePreviewUrl,
      referenceStorageKey: draft.generatedReferenceStorageKey,
      referenceGenerationStatus: "accepted",
    });
  };

  const disabledGenerate = generationAvailable === false;

  return (
    <div className="space-y-4">
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

      {referenceMode === "upload" ?
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

      {referenceMode === "generate" ?
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="max-h-80 w-full rounded-xl object-contain shadow-sm"
              />
              <p className="text-sm font-medium text-zinc-800">
                {t("studio.assetCreation.reference.useOfficialQuestion")}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
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
                <button
                  type="button"
                  onClick={onBackToChoices}
                  className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  {t("studio.assetCreation.reference.backToChoices")}
                </button>
              </div>
            </div>
          : null}

          {draft.referenceGenerationStatus === "idle" && generationAvailable && !draft.summaryPrompt.trim() ?
            <p className="text-sm text-amber-700">
              {t("studio.assetCreation.reference.summaryRequired")}
            </p>
          : null}
        </div>
      : null}

      {referenceMode === "skip" ?
        <p className="text-sm text-zinc-600">{t("studio.assetCreation.reference.skipHint")}</p>
      : null}
    </div>
  );
}
