"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { analyzeAssetStyleDnaApi } from "@/lib/studio-asset-derivation-client";
import { draftPatchFromVisionAnalysis } from "@/lib/studio-asset-vision-analysis";
import { postWizardImageUpload } from "@/lib/instant-image-upload-client";
import { preprocessImageFile } from "@/lib/image-preprocess";
import {
  buildCharacterExtractionDraft,
  EMPTY_CHARACTER_EXTRACTION_CUSTOMIZATION,
  visionObjectTypeLabel,
  type StudioCharacterExtractionCustomization,
  type StudioCharacterExtractionMode,
} from "@/lib/studio-character-entry-actions";
import { runCharacterCreationPipeline } from "@/lib/studio-character-generation-pipeline";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { CharacterPipelineResult } from "@/types/studio-character-generation-pipeline";

type Step = "upload" | "analyze" | "mode" | "customize" | "preview" | "generate";

type Props = {
  storyboardId?: string;
  suggestedName?: string;
  seedImageUrl?: string;
  seedStorageKey?: string;
  onComplete: (result: CharacterPipelineResult) => void;
  onCancel: () => void;
};

const MODES: StudioCharacterExtractionMode[] = ["exact", "custom_variant", "new_character"];

const CUSTOMIZE_FIELDS: Array<keyof StudioCharacterExtractionCustomization> = [
  "clothing",
  "props",
  "colors",
  "style",
  "age",
  "gender",
  "brandTraits",
];

/**
 * @deprecated Use /studio/characters/from-reference — inline extraction retained for migration logging only.
 */
export function StudioCharacterExtractionFlow({
  storyboardId,
  suggestedName,
  seedImageUrl,
  seedStorageKey,
  onComplete,
  onCancel,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(seedImageUrl ? "analyze" : "upload");
  const [imageUrl, setImageUrl] = useState(seedImageUrl ?? "");
  const [storageKey, setStorageKey] = useState(seedStorageKey ?? "");
  const [vision, setVision] = useState<AssetVisionAnalysis | null>(null);
  const [mode, setMode] = useState<StudioCharacterExtractionMode>("exact");
  const [customization, setCustomization] = useState<StudioCharacterExtractionCustomization>(
    EMPTY_CHARACTER_EXTRACTION_CUSTOMIZATION
  );
  const [previewUrl, setPreviewUrl] = useState(seedImageUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progressLabel, setProgressLabel] = useState("");

  const runVisionAnalysis = useCallback(
    async (url: string) => {
      setBusy(true);
      setError("");
      setStep("analyze");
      setProgressLabel(t("studio.v10_1.character.extract.analyzing" as never));
      const res = await analyzeAssetStyleDnaApi({
        imageUrl: url,
        sourceKind: "character",
        sourceName: suggestedName ?? "upload",
        derivationJobId: crypto.randomUUID(),
      });
      setBusy(false);
      if (!res.ok) {
        setError((res.data as { error?: string }).error ?? t("studio.v10_1.character.extract.error" as never));
        setStep("upload");
        return;
      }
      setVision(res.data.visionAnalysis);
      draftPatchFromVisionAnalysis(res.data.visionAnalysis, suggestedName ?? "");
      setStep("mode");
    },
    [suggestedName, t]
  );

  useEffect(() => {
    if (seedImageUrl && seedStorageKey && !vision && step === "analyze") {
      queueMicrotask(() => {
        void runVisionAnalysis(seedImageUrl);
      });
    }
  }, [seedImageUrl, seedStorageKey, vision, step, runVisionAnalysis]);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const { optimizedBlob, thumbnailBlob, mimeType } = await preprocessImageFile(file);
      const formData = new FormData();
      formData.set("workingImage", optimizedBlob, "working.jpg");
      formData.set("thumbnailImage", thumbnailBlob, "thumb.jpg");
      formData.set("originalFileName", file.name);
      formData.set("mimeType", mimeType);
      formData.set("sizeBytes", String(file.size));
      formData.set("clientUploadId", crypto.randomUUID());
      const uploaded = await postWizardImageUpload(formData);
      setImageUrl(uploaded.workingImageUrl);
      setStorageKey(uploaded.workingStorageKey);
      setPreviewUrl(uploaded.workingImageUrl);
      setBusy(false);
      await runVisionAnalysis(uploaded.workingImageUrl);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : t("studio.v10_1.character.extract.error" as never));
    }
  };

  const handleGenerate = async () => {
    if (!imageUrl || !storageKey) return;
    setBusy(true);
    setError("");
    setStep("generate");
    setProgressLabel(t("studio.v10_1.character.extract.generating" as never));
    const draft = buildCharacterExtractionDraft({
      imageUrl,
      storageKey,
      vision,
      mode,
      customization,
      suggestedName,
    });
    try {
      const result = await runCharacterCreationPipeline({
        draft,
        storyboardId: storyboardId ?? null,
        onProgress: ({ stepId, previewUrl: stepPreview }) => {
          setProgressLabel(t(`studio.characters.pipeline.step.${stepId}` as never));
          if (stepPreview) {
            setPreviewUrl(stepPreview);
          }
        },
      });
      setBusy(false);
      onComplete(result);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : t("studio.v10_1.character.extract.error" as never));
      setStep("preview");
    }
  };

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4" data-testid="studio-character-extraction-flow">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-zinc-900">{t("studio.v10_1.character.extract.title" as never)}</h4>
        <button type="button" onClick={onCancel} className="text-xs font-semibold text-zinc-500 hover:text-zinc-800">
          {t("studio.productionBrief.back")}
        </button>
      </div>

      {step === "upload" ?
        <div className="mt-3 space-y-3">
          <p className="text-xs text-zinc-600">{t("studio.v10_1.character.extract.uploadLead" as never)}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-dashed border-[#0067B1] bg-white px-4 py-2 text-sm font-semibold text-[#0067B1]"
          >
            {t("studio.v10_1.character.extract.upload" as never)}
          </button>
        </div>
      : null}

      {step === "analyze" && busy ?
        <div className="mt-4">
          <HomeCheffOrbitLoader state="generating" size="sm" message={progressLabel} />
        </div>
      : null}

      {vision && (step === "mode" || step === "customize" || step === "preview") ?
        <p className="mt-2 text-xs text-emerald-800">
          {t("studio.v10_1.character.extract.detected" as never)}:{" "}
          <strong>{visionObjectTypeLabel(vision.objectType, locale === "nl" ? "nl" : "en")}</strong>
          {vision.confidence != null ? ` (${Math.round(vision.confidence * 100)}%)` : ""}
        </p>
      : null}

      {step === "mode" ?
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-zinc-800">{t("studio.v10_1.character.extract.modeTitle" as never)}</p>
          {MODES.map((value) => (
            <label key={value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-white p-2">
              <input
                type="radio"
                name="extractionMode"
                checked={mode === value}
                onChange={() => setMode(value)}
                className="mt-1"
              />
              <span>
                <span className="text-sm font-medium text-zinc-900">
                  {t(`studio.v10_1.character.extract.mode.${value}` as never)}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {t(`studio.v10_1.character.extract.mode.${value}Hint` as never)}
                </span>
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => setStep(mode === "exact" ? "preview" : "customize")}
            className="mt-2 rounded-full bg-[#006D52] px-4 py-2 text-xs font-semibold text-white"
          >
            {t("editor.flow.continue" as never)}
          </button>
        </div>
      : null}

      {step === "customize" ?
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CUSTOMIZE_FIELDS.map((field) => (
            <label key={field} className="block text-xs">
              <span className="font-semibold text-zinc-700">
                {t(`studio.v10_1.character.extract.customize.${field}` as never)}
              </span>
              <input
                type="text"
                value={customization[field]}
                onChange={(e) => setCustomization((prev) => ({ ...prev, [field]: e.target.value }))}
                className="mt-0.5 w-full rounded border border-zinc-200 px-2 py-1"
              />
            </label>
          ))}
          <div className="sm:col-span-2 flex gap-2">
            <button type="button" onClick={() => setStep("mode")} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
              {t("studio.productionBrief.back")}
            </button>
            <button type="button" onClick={() => setStep("preview")} className="rounded-full bg-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white">
              {t("studio.v10_1.character.extract.preview" as never)}
            </button>
          </div>
        </div>
      : null}

      {step === "preview" ?
        <div className="mt-3 space-y-3">
          {previewUrl ?
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            </div>
          : null}
          <p className="text-xs text-zinc-600">{t("studio.v10_1.character.extract.previewLead" as never)}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("studio.v10_1.character.extract.generate" as never)}
          </button>
        </div>
      : null}

      {step === "generate" && busy ?
        <div className="mt-4">
          <HomeCheffOrbitLoader state="generating" size="sm" message={progressLabel} />
        </div>
      : null}

      {error ?
        <p className="mt-2 text-xs text-red-700">{error}</p>
      : null}
    </div>
  );
}
