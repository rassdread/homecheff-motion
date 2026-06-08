"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  analyzeAssetStyleDnaApi,
  fetchAssetDerivationSources,
} from "@/lib/studio-asset-derivation-client";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
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
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const jobIdRef = useRef(draft.referenceGenerationId || crypto.randomUUID());

  useEffect(() => {
    void fetchAssetDerivationSources().then((res) => {
      if (res.ok) {
        setSources(res.data.sources);
      }
      setLoadingSources(false);
    });
  }, []);

  const runStyleExtraction = useCallback(
    async (source: AssetDerivationSource) => {
      onDraftChange({
        derivationSource: source,
        ...recordWizardSourceReference({
          imageUrl: source.referenceImageUrl,
          storageKey: source.referenceStorageKey,
          name: source.assetName,
        }),
        derivationStyleDnaStatus: "loading",
        derivationStyleDnaError: "",
        derivationStyleDna: null,
        referenceGenerationId: jobIdRef.current,
      });

      const res = await analyzeAssetStyleDnaApi({
        imageUrl: source.referenceImageUrl,
        sourceKind: source.sourceKind,
        sourceName: source.assetName,
        derivationJobId: jobIdRef.current,
      });

      if (!res.ok) {
        onDraftChange({
          derivationStyleDnaStatus: "failed",
          derivationStyleDnaError:
            (res.data as { error?: string }).error ?? t("studio.assetDerivation.source.analyzeFailed"),
        });
        return;
      }

      onDraftChange({
        derivationStyleDna: res.data.styleDna,
        derivationStyleDnaStatus: "ready",
        name: draft.name || `${source.assetName} variant`,
      });
    },
    [draft.name, onDraftChange, t]
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
        const source: AssetDerivationSource = {
          sourceType: "upload",
          sourceKind: draft.kind,
          assetId: null,
          assetName: file.name.replace(/\.[^.]+$/, ""),
          referenceImageUrl: uploaded.workingImageUrl,
          referenceStorageKey: uploaded.workingStorageKey,
        };
        onDraftChange(
          recordWizardSourceReference({
            imageUrl: uploaded.workingImageUrl,
            storageKey: uploaded.workingStorageKey,
            name: source.assetName,
          })
        );
        await runStyleExtraction(source);
      } catch (e) {
        setUploadError(
          e instanceof ImageUploadError ? e.message : t("studio.assetCreation.input.uploadFailed")
        );
      } finally {
        setUploading(false);
      }
    },
    [draft.kind, runStyleExtraction, t]
  );

  const source = draft.derivationSource;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">
          {t("studio.assetDerivation.source.title")}
        </h3>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetDerivation.source.hint")}</p>
      </div>

      {loadingSources ?
        <p className="text-sm text-zinc-500">{t("button.loading")}</p>
      : sources.length > 0 ?
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.slice(0, 12).map((item) => (
            <button
              key={`${item.assetId}-${item.referenceImageUrl}`}
              type="button"
              onClick={() => void runStyleExtraction(toSource(item))}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                source?.referenceImageUrl === item.referenceImageUrl
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

      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
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
          className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
        >
          {uploading ? t("button.loading") : t("studio.assetDerivation.source.upload")}
        </button>
        {uploadError ? <p className="mt-2 text-sm text-red-700">{uploadError}</p> : null}
      </div>

      {draft.derivationStyleDnaStatus === "loading" ?
        <p className="text-sm font-medium text-zinc-700" role="status">
          {t("studio.assetDerivation.source.analyzing")}
        </p>
      : null}
      {draft.derivationStyleDnaStatus === "failed" ?
        <p className="text-sm text-red-700">{draft.derivationStyleDnaError}</p>
      : null}
      {draft.derivationStyleDnaStatus === "ready" && source ?
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
          <p className="font-semibold text-emerald-800">
            {source.assetName} — {t("studio.assetDerivation.source.ready")}
          </p>
          {draft.derivationStyleDna?.colorTheme ?
            <p className="mt-1 text-emerald-900">
              {t("studio.assetDerivation.source.colors")}: {draft.derivationStyleDna.colorTheme}
            </p>
          : null}
        </div>
      : null}
    </div>
  );
}
