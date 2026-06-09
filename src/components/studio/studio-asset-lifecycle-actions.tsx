"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { StudioAssetLifecycleDialog } from "@/components/studio/studio-asset-lifecycle-dialog";
import {
  allowedRemoveModes,
  classifyRemoveEligibility,
  resolveAssetKindFromStudioAsset,
} from "@/lib/studio-asset-lifecycle-eligibility";
import {
  fetchRegistryAssetUsage,
  removeRegistryAssetApi,
  type AssetRemoveMode,
} from "@/lib/studio-asset-lifecycle-client";
import type { StudioAsset } from "@/types/studio-media-asset";

type Props = {
  asset: StudioAsset;
  userId: string;
  onRemoved?: () => void;
};

export function StudioAssetLifecycleActions({ asset, userId, onRemoved }: Props) {
  const t = useActiveTranslator();
  const [usageCount, setUsageCount] = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [pendingMode, setPendingMode] = useState<AssetRemoveMode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const assetKind = resolveAssetKindFromStudioAsset(asset);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoadingUsage(true));
    void (async () => {
      const res = await fetchRegistryAssetUsage({
        assetId: asset.id,
        assetKind,
        storageKey: asset.storageKey,
        generationId: asset.generationId,
      });
      if (!cancelled) {
        setUsageCount(res.ok ? res.usage.usageCount : 0);
        setLoadingUsage(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.storageKey, asset.generationId, assetKind]);

  const eligibility = classifyRemoveEligibility({
    asset,
    userId,
    usageCount,
    mode: "delete",
  });
  const modes = allowedRemoveModes(eligibility);

  if (modes.length === 0) {
    return null;
  }

  const handleConfirm = async () => {
    if (!pendingMode) {
      return;
    }
    setSubmitting(true);
    const res = await removeRegistryAssetApi({
      assetId: asset.id,
      assetKind,
      storageKey: asset.storageKey,
      removeMode: pendingMode,
    });
    setSubmitting(false);
    setPendingMode(null);
    if (res.ok) {
      setToast(t("studio.assetsHub.lifecycle.removedToast"));
      onRemoved?.();
      window.setTimeout(() => setToast(""), 4000);
    }
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {usageCount > 0 ?
          <p className="w-full text-xs text-amber-700">
            {t("studio.assetsHub.lifecycle.usedIn", { count: String(usageCount) })}
          </p>
        : null}
        {modes.includes("hide") ?
          <button
            type="button"
            disabled={loadingUsage || submitting}
            onClick={() => setPendingMode("hide")}
            className="min-h-[44px] rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            {t("studio.assetsHub.lifecycle.action.hide")}
          </button>
        : null}
        {modes.includes("archive") ?
          <button
            type="button"
            disabled={loadingUsage || submitting}
            onClick={() => setPendingMode("archive")}
            className="min-h-[44px] rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            {t("studio.assetsHub.lifecycle.action.archive")}
          </button>
        : null}
        {modes.includes("delete") ?
          <button
            type="button"
            disabled={loadingUsage || submitting}
            onClick={() => setPendingMode("delete")}
            className="min-h-[44px] rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
          >
            {t("studio.assetsHub.lifecycle.action.delete")}
          </button>
        : null}
      </div>
      {toast ?
        <p className="mt-2 text-xs font-medium text-[#006D52]">{toast}</p>
      : null}
      <StudioAssetLifecycleDialog
        open={pendingMode !== null}
        mode={pendingMode ?? "hide"}
        usageCount={usageCount}
        loading={submitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPendingMode(null)}
      />
    </>
  );
}
