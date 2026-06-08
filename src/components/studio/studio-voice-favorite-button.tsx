"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  fetchAssetLibraryPreferences,
  toggleVoiceFavoriteApi,
} from "@/lib/studio-asset-library-client";

type Props = {
  voiceRef: string;
  onToggle?: (favorite: boolean) => void;
};

export function StudioVoiceFavoriteButton({ voiceRef, onToggle }: Props) {
  const t = useActiveTranslator();
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchAssetLibraryPreferences().then((res) => {
      if (res.ok) {
        setFavorite(res.data.voiceFavorites.some((v) => v.voiceRef === voiceRef));
      }
    });
  }, [voiceRef]);

  const handleClick = useCallback(async () => {
    setLoading(true);
    const next = !favorite;
    const res = await toggleVoiceFavoriteApi({ voiceRef, favorite: next });
    if (res.ok) {
      setFavorite(next);
      onToggle?.(next);
    }
    setLoading(false);
  }, [favorite, voiceRef, onToggle]);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleClick()}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-violet-200 bg-white text-lg hover:bg-violet-50"
      aria-label={t("studio.mediaAsset.action.favorite")}
    >
      {favorite ? "★" : "☆"}
    </button>
  );
}
