"use client";

import { useActiveTranslator } from "@/i18n/client";
import { StudioAssetLibraryActions } from "@/components/studio/studio-asset-library-actions";
import { StudioAssetUsagePanel } from "@/components/studio/studio-asset-usage-panel";
import { STUDIO_ASSET_COLLECTIONS } from "@/lib/studio-media-asset-collections";
import type { StudioAsset, StudioAssetUsageEntry } from "@/types/studio-media-asset";

type Props = {
  asset: StudioAsset;
  usage?: StudioAssetUsageEntry | null;
  isAdmin?: boolean;
  onClose?: () => void;
  onFavoriteChange?: (assetId: string, favorite: boolean) => void;
};

export function StudioAssetDetailView({ asset, usage, isAdmin, onClose, onFavoriteChange }: Props) {
  const t = useActiveTranslator();
  const collections = STUDIO_ASSET_COLLECTIONS.filter((c) => asset.collectionIds.includes(c.id));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {asset.sourceRef.entityType === "world"
              ? t("studio.mediaAsset.tab.world")
              : t(`studio.mediaAsset.tab.${asset.category}` as never)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{asset.name}</h3>
        </div>
        {onClose ?
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            {t("studio.mediaAsset.close")}
          </button>
        : null}
      </div>

      {asset.previewUrl ?
        <img
          src={asset.previewUrl}
          alt={asset.name}
          className="mt-3 max-h-48 w-full rounded-xl border border-slate-100 object-cover"
        />
      : null}

      <dl className="mt-4 space-y-2 text-xs text-slate-700">
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.description")}</dt>
          <dd className="mt-0.5">{asset.description || "—"}</dd>
        </div>
        {asset.origin ?
          <div>
            <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.origin")}</dt>
            <dd className="mt-0.5">{t(`studio.mediaAsset.origin.${asset.origin}` as never)}</dd>
          </div>
        : null}
        {asset.promptSummary ?
          <div>
            <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.prompt")}</dt>
            <dd className="mt-0.5 line-clamp-4">{asset.promptSummary}</dd>
          </div>
        : null}
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.source")}</dt>
          <dd className="mt-0.5">{t(`studio.mediaAsset.source.${asset.source}` as never)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.updated")}</dt>
          <dd className="mt-0.5">{new Date(asset.updatedAt).toLocaleString()}</dd>
        </div>
        {collections.length > 0 ?
          <div>
            <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.collections")}</dt>
            <dd className="mt-0.5">{collections.map((c) => t(c.labelKey as never)).join(" · ")}</dd>
          </div>
        : null}
      </dl>

      {usage && usage.usedBy.length > 0 ?
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-900">{t("studio.mediaAsset.detail.usage")}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {usage.usedBy.map((ref) => (
              <li key={`${ref.entityType}-${ref.entityId}`}>
                {t(`studio.mediaAsset.usage.${ref.entityType}` as never)}: {ref.entityName}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {asset.sourceRef.entityType === "character" ||
      asset.sourceRef.entityType === "prop" ||
      asset.sourceRef.entityType === "location" ||
      asset.sourceRef.entityType === "world" ?
        <StudioAssetUsagePanel
          kind={asset.sourceRef.entityType}
          assetId={asset.sourceRef.entityId}
          assetName={asset.name}
          compact
        />
      : null}

      <StudioAssetLibraryActions
        asset={asset}
        isAdmin={isAdmin}
        onFavoriteChange={onFavoriteChange}
      />
    </div>
  );
}
