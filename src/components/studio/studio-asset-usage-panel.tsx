"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { AssetStoryUsageReport, AssetUsageKind } from "@/types/studio-asset-usage";

type Props = {
  kind: AssetUsageKind;
  assetId: string;
  assetName?: string;
  compact?: boolean;
};

export function StudioAssetUsagePanel({ kind, assetId, compact }: Props) {
  const t = useActiveTranslator();
  const [usage, setUsage] = useState<AssetStoryUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    void (async () => {
      const res = await fetch(
        `/api/studio/asset-usage?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(assetId)}`,
        { cache: "no-store" }
      );
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        queueMicrotask(() => {
          setError(t("studio.assetUsage.error"));
          setUsage(null);
          setLoading(false);
        });
        return;
      }
      const data = (await res.json()) as { usage: AssetStoryUsageReport };
      queueMicrotask(() => {
        setUsage(data.usage);
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, assetId, t]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("studio.assetUsage.loading")}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!usage) {
    return null;
  }

  const hasStoryboardUsage = usage.storyboards.length > 0;
  const hasWorldMembers =
    kind === "world" &&
    ((usage.characters?.length ?? 0) > 0 ||
      (usage.props?.length ?? 0) > 0 ||
      (usage.locations?.length ?? 0) > 0);

  if (!hasStoryboardUsage && !hasWorldMembers) {
    return (
      <div className={compact ? "mt-3" : "mt-4 rounded-2xl border border-zinc-200 bg-white p-4"}>
        <p className="text-sm font-semibold text-zinc-900">{t("studio.assetUsage.title")}</p>
        <p className="mt-1 text-sm text-zinc-500">{t("studio.assetUsage.empty")}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "mt-3 space-y-3" : "mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"}>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{t("studio.assetUsage.title")}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {t("studio.assetUsage.summary", {
            scenes: usage.sceneCount,
            storyboards: usage.storyboardCount,
          })}
        </p>
      </div>

      {usage.storyboards.length > 0 ?
        <ul className="space-y-3">
          {usage.storyboards.map((sb) => (
            <li key={sb.storyboardId} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
              <Link href={sb.href} className="text-sm font-semibold text-[#0067B1] hover:underline">
                {sb.storyboardTitle}
              </Link>
              {sb.scenes.length > 0 ?
                <ul className="mt-2 space-y-1 pl-3">
                  {sb.scenes.map((scene) => (
                    <li key={scene.sceneId}>
                      <Link href={scene.href} className="text-xs text-[#006D52] hover:underline">
                        {t("studio.assetUsage.sceneLabel", { order: scene.sceneOrder + 1 })} —{" "}
                        {scene.sceneTitle}
                      </Link>
                    </li>
                  ))}
                </ul>
              : null}
            </li>
          ))}
        </ul>
      : null}

      {kind === "world" && usage.characters && usage.characters.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetUsage.worldCharacters")}
          </p>
          <ul className="mt-1 space-y-1">
            {usage.characters.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-sm text-[#0067B1] hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {kind === "world" && usage.props && usage.props.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.assetUsage.worldProps")}</p>
          <ul className="mt-1 space-y-1">
            {usage.props.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-sm text-[#0067B1] hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {kind === "world" && usage.locations && usage.locations.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetUsage.worldLocations")}
          </p>
          <ul className="mt-1 space-y-1">
            {usage.locations.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-sm text-[#0067B1] hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      : null}
    </div>
  );
}
