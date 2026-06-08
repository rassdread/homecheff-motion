"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  assetDownloadFilename,
  buildAssetDownloadHref,
  copyAssetLinkToClipboard,
  hasDownloadableImage,
  resolveAssetDownloadUrl,
} from "@/lib/studio-asset-download";
import {
  recordAssetRecentApi,
  toggleAssetFavoriteApi,
} from "@/lib/studio-asset-library-client";
import type { StudioAsset } from "@/types/studio-media-asset";

type Props = {
  asset: StudioAsset;
  isAdmin?: boolean;
  onFavoriteChange?: (assetId: string, favorite: boolean) => void;
};

export function StudioAssetLibraryActions({ asset, isAdmin, onFavoriteChange }: Props) {
  const t = useActiveTranslator();
  const [copied, setCopied] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const downloadUrl = resolveAssetDownloadUrl(asset);

  const handleCopy = async () => {
    if (!downloadUrl) {
      return;
    }
    const ok = await copyAssetLinkToClipboard(downloadUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFavorite = async () => {
    setFavoriting(true);
    const next = !asset.isFavorite;
    const res = await toggleAssetFavoriteApi(asset.id, next);
    if (res.ok) {
      onFavoriteChange?.(asset.id, next);
    }
    setFavoriting(false);
  };

  const handleOpen = () => {
    void recordAssetRecentApi(asset.id);
  };

  const deriveHref = (() => {
    const ref = asset.sourceRef;
    if (ref.entityType === "character") {
      return `/studio/characters/new?deriveFrom=${encodeURIComponent(ref.entityId)}`;
    }
    if (ref.entityType === "prop") {
      return `/studio/props/new?deriveFrom=${encodeURIComponent(ref.entityId)}`;
    }
    if (ref.entityType === "location") {
      return `/studio/locations/new?deriveFrom=${encodeURIComponent(ref.entityId)}`;
    }
    if (asset.generationId) {
      return `/studio/characters/new?entry=derive&sourceGeneration=${encodeURIComponent(asset.generationId)}`;
    }
    return null;
  })();

  const entityHref = (() => {
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
    if (ref.entityType === "world") {
      return `/studio/worlds/${encodeURIComponent(ref.entityId)}`;
    }
    return null;
  })();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {hasDownloadableImage(asset) && downloadUrl ?
        <a
          href={buildAssetDownloadHref(downloadUrl, assetDownloadFilename(asset.name, downloadUrl))}
          className="inline-flex min-h-[44px] items-center rounded-full border border-[#006D52]/30 bg-[#006D52]/5 px-4 py-2 text-sm font-semibold text-[#006D52] hover:bg-[#006D52]/10"
          onClick={handleOpen}
        >
          {t("studio.mediaAsset.action.download")}
        </a>
      : null}
      {downloadUrl ?
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          {copied ? t("studio.mediaAsset.action.copied") : t("studio.mediaAsset.action.copyLink")}
        </button>
      : null}
      {asset.owner !== "system" ?
        <button
          type="button"
          disabled={favoriting}
          onClick={() => void handleFavorite()}
          className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          {asset.isFavorite ? "★" : "☆"} {t("studio.mediaAsset.action.favorite")}
        </button>
      : null}
      {deriveHref ?
        <Link
          href={deriveHref}
          onClick={handleOpen}
          className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          {t("studio.mediaAsset.action.makeVariant")}
        </Link>
      : null}
      {entityHref ?
        <Link
          href={entityHref}
          onClick={handleOpen}
          className="inline-flex min-h-[44px] items-center rounded-full border border-[#006D52]/30 px-4 py-2 text-sm font-semibold text-[#006D52] hover:underline"
        >
          {t("studio.mediaAsset.detail.openEntity")} →
        </Link>
      : null}
      {isAdmin && asset.storageKey ?
        <p className="w-full text-[10px] text-zinc-500 break-all">
          {t("studio.mediaAsset.admin.storageKey")}: {asset.storageKey}
          {asset.generationId ? ` · gen: ${asset.generationId}` : ""}
        </p>
      : null}
    </div>
  );
}
