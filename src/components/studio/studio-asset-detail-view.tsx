"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { STUDIO_ASSET_COLLECTIONS } from "@/lib/studio-media-asset-collections";
import type { StudioAsset, StudioAssetUsageEntry } from "@/types/studio-media-asset";

type Props = {
  asset: StudioAsset;
  usage?: StudioAssetUsageEntry | null;
  onClose?: () => void;
};

export function StudioAssetDetailView({ asset, usage, onClose }: Props) {
  const t = useActiveTranslator();
  const collections = STUDIO_ASSET_COLLECTIONS.filter((c) => asset.collectionIds.includes(c.id));

  const entityLink = (() => {
    const ref = asset.sourceRef;
    if (ref.entityType === "character") {
      return `/studio/characters/${encodeURIComponent(ref.entityId)}`;
    }
    if (ref.entityType === "location") {
      return `/studio/locations/${encodeURIComponent(ref.entityId)}`;
    }
    if (ref.entityType === "prop") {
      return `/studio/props/${encodeURIComponent(ref.entityId)}`;
    }
    return null;
  })();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t(`studio.mediaAsset.tab.${asset.category}` as never)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{asset.name}</h3>
        </div>
        {onClose ?
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            {t("studio.mediaAsset.close")}
          </button>
        : null}
      </div>

      {asset.previewUrl ?
        <img
          src={asset.previewUrl}
          alt={asset.name}
          className="mt-3 max-h-40 w-full rounded-lg border border-slate-100 object-cover"
        />
      : null}

      <dl className="mt-4 space-y-2 text-xs text-slate-700">
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.description")}</dt>
          <dd className="mt-0.5">{asset.description || "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.source")}</dt>
          <dd className="mt-0.5 capitalize">{t(`studio.mediaAsset.source.${asset.source}` as never)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.owner")}</dt>
          <dd className="mt-0.5">{asset.owner === "system" ? t("studio.mediaAsset.owner.system") : asset.owner}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.tags")}</dt>
          <dd className="mt-0.5">{asset.tags.join(", ") || "—"}</dd>
        </div>
        {collections.length > 0 ?
          <div>
            <dt className="font-medium text-slate-900">{t("studio.mediaAsset.detail.collections")}</dt>
            <dd className="mt-0.5">
              {collections.map((c) => t(c.labelKey as never)).join(" · ")}
            </dd>
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
                {ref.sceneOrder != null ? ` (#${ref.sceneOrder + 1})` : ""}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {entityLink ?
        <Link
          href={entityLink}
          className="mt-4 inline-block text-xs font-semibold text-[#006D52] hover:underline"
        >
          {t("studio.mediaAsset.detail.openEntity")} →
        </Link>
      : null}
    </div>
  );
}
