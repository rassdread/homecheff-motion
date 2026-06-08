"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { StoryboardRelationshipsReport } from "@/types/studio-asset-usage";

type Props = {
  storyboardId: string;
};

export function StudioStoryboardRelationshipsPanel({ storyboardId }: Props) {
  const t = useActiveTranslator();
  const [data, setData] = useState<StoryboardRelationshipsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/relationships`, {
        cache: "no-store",
      });
      if (cancelled || !res.ok) {
        queueMicrotask(() => setLoading(false));
        return;
      }
      const body = (await res.json()) as { relationships: StoryboardRelationshipsReport };
      queueMicrotask(() => {
        setData(body.relationships);
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [storyboardId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("studio.storyboardRelationships.loading")}</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.storyboardRelationships.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.storyboardRelationships.subtitle")}</p>
      </div>

      {data.worldProfiles.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.storyboardRelationships.worlds")}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {data.worldProfiles.map((w) => (
              <li key={w.id}>
                <Link
                  href={w.href}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 px-3 text-sm font-medium text-[#0067B1] hover:bg-zinc-50"
                >
                  {w.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {data.voices.length > 0 ?
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.storyboardRelationships.voices")}
          </p>
          <ul className="mt-1 text-sm text-zinc-700">
            {data.voices.map((v, i) => (
              <li key={`${v.language}-${i}`}>
                {v.language.toUpperCase()} — {v.status}
              </li>
            ))}
          </ul>
        </div>
      : null}

      <div className="space-y-3">
        {data.scenes.map((scene) => (
          <div key={scene.sceneId} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="text-sm font-semibold text-zinc-900">
              {t("studio.storyboardRelationships.scene", { order: scene.order + 1 })} — {scene.title}
            </p>
            {scene.location ?
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.storyboardRelationships.location")}:{" "}
                <Link href={scene.location.href} className="font-medium text-[#0067B1] hover:underline">
                  {scene.location.name}
                </Link>
              </p>
            : null}
            {scene.characters.length > 0 ?
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.storyboardRelationships.characters")}:{" "}
                {scene.characters.map((c, idx) => (
                  <span key={c.id}>
                    {idx > 0 ? ", " : ""}
                    <Link href={c.href} className="font-medium text-[#0067B1] hover:underline">
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            : null}
            {scene.props.length > 0 ?
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.storyboardRelationships.props")}:{" "}
                {scene.props.map((p, idx) => (
                  <span key={p.id}>
                    {idx > 0 ? ", " : ""}
                    <Link href={p.href} className="font-medium text-[#0067B1] hover:underline">
                      {p.name}
                    </Link>
                  </span>
                ))}
              </p>
            : null}
            {scene.hasGeneratedImage ?
              <p className="mt-1 text-xs text-emerald-700">
                {t("studio.storyboardRelationships.hasImage")}
              </p>
            : null}
          </div>
        ))}
      </div>
    </div>
  );
}
