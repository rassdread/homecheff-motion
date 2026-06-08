"use client";

import { useMemo } from "react";
import {
  StudioWorkspaceAssetPicker,
  type WorkspaceAssetPickerItem,
} from "@/components/studio/studio-workspace-asset-picker";
import { filterAssetsForPickerContext } from "@/lib/studio-asset-visibility";
import type { StudioAssetPickerContext } from "@/types/studio-asset-visibility";
import type { StudioAsset } from "@/types/studio-media-asset";

export function studioAssetsToPickerItems(assets: StudioAsset[]): WorkspaceAssetPickerItem[] {
  return assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    meta: asset.origin ?? asset.category,
    thumbUrl: asset.previewUrl ?? undefined,
  }));
}

type Props = {
  open: boolean;
  title: string;
  assets: StudioAsset[];
  userId: string;
  pickerContext: StudioAssetPickerContext;
  isAdmin?: boolean;
  showSystemAssets?: boolean;
  linkedIds?: Set<string>;
  onClose: () => void;
  onSelect: (assetId: string) => void;
};

/** Context-aware asset picker — user-owned by default; system only when usable in context. */
export function StudioAssetPicker({
  open,
  title,
  assets,
  userId,
  pickerContext,
  isAdmin = false,
  showSystemAssets = false,
  linkedIds,
  onClose,
  onSelect,
}: Props) {
  const items = useMemo(() => {
    const filtered = filterAssetsForPickerContext(assets, {
      userId,
      isAdmin,
      showSystemAssets,
      pickerContext,
    });
    return studioAssetsToPickerItems(filtered);
  }, [assets, userId, isAdmin, showSystemAssets, pickerContext]);

  return (
    <StudioWorkspaceAssetPicker
      open={open}
      title={title}
      items={items}
      linkedIds={linkedIds}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}
