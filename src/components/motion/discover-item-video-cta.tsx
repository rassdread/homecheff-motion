"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildAssistantPrefillRoute,
  storeAssistantPrefillPackage,
} from "@/lib/assistant-prefill-storage";
import { buildMotionHubPrefillPackage } from "@/lib/motion-hub-navigation";
import { brand } from "@/lib/brand";

type ShowcaseExample = {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: string;
};

type Props = {
  itemId: string;
};

export function DiscoverItemVideoCta({ itemId }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [item, setItem] = useState<ShowcaseExample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/showcase-items?pageKey=global");
        const data = (await res.json()) as {
          ok?: boolean;
          items?: ShowcaseExample[];
        };
        const match = data.items?.find((row) => row.id === itemId) ?? null;
        if (!cancelled) {
          setItem(match);
          if (!match) {
            setError("not_found");
          }
        }
      } catch {
        if (!cancelled) {
          setError("load_failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const startVideo = () => {
    if (!item || item.mediaType !== "image") {
      return;
    }
    const pkg = buildMotionHubPrefillPackage({
      photoIntentId: "photo_to_video",
      showcaseItemId: item.id,
      showcaseMediaUrl: item.mediaUrl,
    });
    if (!pkg) {
      return;
    }
    storeAssistantPrefillPackage(pkg);
    router.push(buildAssistantPrefillRoute(pkg.targetRoute, pkg.id));
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("motionHub.marketplace.loading" as never)}</p>;
  }

  if (error || !item) {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-600">{t("motionHub.marketplace.notFound" as never)}</p>
        <Link href="/discover" className="mt-4 inline-block text-sm font-semibold text-[#006D52]">
          ← {t("discover.cta" as never)}
        </Link>
      </div>
    );
  }

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto w-full max-w-lg px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">{t("motionHub.marketplace.title" as never)}</h1>
        <p className="mt-2 text-sm text-zinc-600">{item.title}</p>
        {item.mediaType === "image" ? (
          <GradientButton type="button" className="mt-8 px-8" onClick={startVideo}>
            {t("motionHub.marketplace.cta" as never)}
          </GradientButton>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">{t("motionHub.marketplace.videoOnly" as never)}</p>
        )}
        <Link href="/motion" className="mt-6 block text-sm font-semibold text-[#006D52]">
          {t("motionHub.marketplace.browseMotion" as never)} →
        </Link>
      </section>
    </main>
  );
}
