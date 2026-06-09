"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  applyWizardSourceSelection,
  clearWizardSourceReference,
  hasWizardSourceReference,
  resolveWizardSourceReference,
} from "@/lib/studio-asset-wizard-source-reference";
import type { AssetDerivationSource, AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

function toSource(item: AssetDerivationSourceListItem): AssetDerivationSource {
  return {
    sourceType: item.sourceType,
    sourceKind: item.kind,
    assetId: item.assetId,
    assetName: item.name,
    referenceImageUrl: item.referenceImageUrl,
    referenceStorageKey: item.referenceStorageKey,
    canonicalRole: item.canonicalRole,
  };
}

export function StudioAssetDerivationSourceStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showLibraryPicker, setShowLibraryPicker] = useState(true);

  const hasSource = hasWizardSourceReference(draft);
  const resolvedSource = resolveWizardSourceReference(draft);
  const selectedUrl = draft.derivationSource?.referenceImageUrl ?? resolvedSource?.sourceReferenceImageUrl;

  useEffect(() => {
    void fetchAssetDerivationSources().then((res) => {
      if (res.ok) {
        setSources(res.data.sources);
      }
      setLoadingSources(false);
    });
  }, []);

  const selectSource = useCallback(
    (source: AssetDerivationSource) => {
      setUploadError("");
      setShowLibraryPicker(false);
      onDraftChange((d) => ({
        ...d,
        ...applyWizardSourceSelection(source, d),
      }));
    },
    [onDraftChange]
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
        selectSource({
          sourceType: "upload",
          sourceKind: draft.kind,
          assetId: null,
          assetName: file.name.replace(/\.[^.]+$/, ""),
          referenceImageUrl: uploaded.workingImageUrl,
          referenceStorageKey: uploaded.workingStorageKey,
        });
      } catch (e) {
        setUploadError(
          e instanceof ImageUploadError ? e.message : t("studio.assetCreation.input.uploadFailed")
        );
      } finally {
        setUploading(false);
        if (fileRef.current) {
          fileRef.current.value = "";
        }
      }
    },
    [draft.kind, selectSource, t]
  );

  const openUploadDialog = useCallback(() => {
    setUploadError("");
    fileRef.current?.click();
  }, []);

  const handleChooseOther = useCallback(() => {
    onDraftChange(clearWizardSourceReference());
    setShowLibraryPicker(true);
    queueMicrotask(() => {
      libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [onDraftChange]);

  const handleRemoveSource = useCallback(() => {
    onDraftChange(clearWizardSourceReference());
    setShowLibraryPicker(true);
    setUploadError("");
    queueMicrotask(() => {
      libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [onDraftChange]);

  const showLibrary = !hasSource || showLibraryPicker;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">
          {t("studio.assetDerivation.source.title")}
        </h3>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetDerivation.source.hint")}</p>
      </div>

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

      {hasSource && resolvedSource ?
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
          <p className="font-semibold text-emerald-800">
            {resolvedSource.sourceReferenceName} — {t("studio.assetDerivation.source.selected")}
          </p>
          {resolvedSource.sourceReferenceImageUrl ?
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolvedSource.sourceReferenceImageUrl}
              alt=""
              className="mt-3 max-h-40 w-full rounded-lg object-contain"
            />
          : null}
          <p className="mt-2 text-emerald-900">{t("studio.assetDerivation.source.analyzeNext")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleChooseOther}
              className="min-h-[44px] rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-[#0067B1]"
            >
              {t("studio.assetDerivation.source.chooseOther")}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={openUploadDialog}
              className="min-h-[44px] rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
            >
              {uploading ? t("button.loading") : t("studio.assetDerivation.source.newUpload")}
            </button>
            <button
              type="button"
              onClick={handleRemoveSource}
              className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              {t("studio.assetDerivation.source.remove")}
            </button>
          </div>
        </div>
      : null}

      {showLibrary ?
        <div ref={libraryRef} className="space-y-3">
          <p className="text-sm font-medium text-zinc-800">
            {t("studio.assetDerivation.source.chooseFromLibrary")}
          </p>
          {loadingSources ?
            <p className="text-sm text-zinc-500">{t("button.loading")}</p>
          : sources.length > 0 ?
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.slice(0, 12).map((item) => (
                <button
                  key={`${item.assetId}-${item.referenceImageUrl}`}
                  type="button"
                  onClick={() => selectSource(toSource(item))}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    selectedUrl === item.referenceImageUrl
                      ? "border-[#0067B1] bg-blue-50/50"
                      : "border-zinc-200 hover:border-[#0067B1]/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-zinc-500">
                      {t(`studio.assetCreation.kind.${item.kind}` as never)} ·{" "}
                      {t(`studio.assetDerivation.sourceType.${item.sourceType}` as never)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          : (
            <p className="text-sm text-zinc-600">{t("studio.assetDerivation.source.empty")}</p>
          )}
        </div>
      : null}

      {!hasSource ?
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
          <button
            type="button"
            disabled={uploading}
            onClick={openUploadDialog}
            className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
          >
            {uploading ? t("button.loading") : t("studio.assetDerivation.source.upload")}
          </button>
          {uploadError ? <p className="mt-2 text-sm text-red-700">{uploadError}</p> : null}
        </div>
      : uploadError ?
        <p className="text-sm text-red-700">{uploadError}</p>
      : null}
    </div>
  );
}
