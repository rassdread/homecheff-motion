"use client";

import { useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import {
  createEditorPlacementItem,
  listRecentEditorPlacements,
  rememberRecentEditorPlacement,
} from "@/lib/editor-placement-canvas";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { EditorCanvasLayer, EditorPlacementItem } from "@/types/homecheff-visual-editor";
import type { ReferencePlacementType } from "@/types/studio-asset-generation-workbench";

type Props = {
  targetLayer: EditorCanvasLayer | null;
  customTarget: boolean;
  onAdd: (placement: EditorPlacementItem) => void;
  onClose: () => void;
};

export function EditorAddPlacementPanel({ targetLayer, customTarget, onAdd, onClose }: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);
  const recent = listRecentEditorPlacements();

  const finish = (params: {
    sourceName: string;
    sourcePreviewUrl: string;
    sourceStorageKey: string;
    sourceAssetId?: string | null;
    placementType?: ReferencePlacementType;
  }) => {
    const placement = createEditorPlacementItem({
      ...params,
      targetLayer: customTarget ? null : targetLayer,
      customTarget,
    });
    rememberRecentEditorPlacement(params);
    onAdd(placement);
    onClose();
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const uploaded = await uploadEditorSourceImage(file);
      finish({
        sourceName: file.name.replace(/\.[^.]+$/, ""),
        sourcePreviewUrl: uploaded.workingImageUrl,
        sourceStorageKey: uploaded.workingStorageKey,
        placementType: "logo",
      });
    } catch {
      setError(t("editor.placement.uploadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loadLibrary = async () => {
    setLoading(true);
    setError("");
    const res = await fetchAssetDerivationSources();
    setLoading(false);
    if (!res.ok) {
      setError(t("editor.placement.libraryFailed"));
      return;
    }
    setSources(res.data.sources.filter((s) => s.referenceImageUrl?.trim()));
    setShowLibrary(true);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-600">
        {customTarget
          ? t("editor.placement.targetCustom")
          : t("editor.placement.targetLayer", { label: targetLayer?.label ?? "—" })}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-xl border border-[#0067B1]/30 bg-white px-4 py-3 text-left text-sm font-semibold hover:bg-[#0067B1]/5"
        >
          {t("editor.placement.uploadSource")}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadLibrary()}
          className="min-h-11 rounded-xl border border-[#006D52]/30 bg-white px-4 py-3 text-left text-sm font-semibold hover:bg-[#006D52]/5"
        >
          {t("editor.placement.chooseLibrary")}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {recent.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("editor.placement.recent")}</p>
          <ul className="mt-2 space-y-1">
            {recent.map((item) => (
              <li key={item.sourceStorageKey}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-zinc-100 px-2 py-2 text-left hover:bg-zinc-50"
                  onClick={() => finish(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.sourcePreviewUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="text-sm">{item.sourceName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      : null}
      {showLibrary ?
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {sources.map((source) => (
            <li key={`${source.assetId}-${source.name}`}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-zinc-50"
                onClick={() =>
                  finish({
                    sourceName: source.name,
                    sourcePreviewUrl: source.referenceImageUrl,
                    sourceStorageKey: source.referenceStorageKey,
                    sourceAssetId: source.assetId,
                    placementType: "logo",
                  })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={source.thumbnailUrl || source.referenceImageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                <span className="text-sm">{source.name}</span>
              </button>
            </li>
          ))}
        </ul>
      : null}
    </div>
  );
}
