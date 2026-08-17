"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  PX4_SESSION_STORAGE_KEY,
  px4SessionRememberPayload,
  type Px4ResolveResult,
} from "@/lib/studio-px4-source-context";

export function StudioPx4SourceBanner({ result }: { result: Px4ResolveResult }) {
  const t = useActiveTranslator();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (result.ok) {
      window.sessionStorage.setItem(PX4_SESSION_STORAGE_KEY, px4SessionRememberPayload(result.context));
    }
  }, [result]);

  if (!result.ok) {
    return (
      <section className={`space-y-3 p-4 sm:p-5 ${studioVisual.editorSurface}`} data-testid="px4-source-unresolved">
        <p className="text-sm leading-relaxed text-zinc-600">{t("px4.context.unresolved")}</p>
        <Link
          href="/studio/experience"
          prefetch={false}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#006D52] underline-offset-2 hover:underline"
        >
          {t("px4.context.continueNormal")}
        </Link>
      </section>
    );
  }

  const { context } = result;
  const preview = context.media[0]?.url ?? null;

  return (
    <section className={`space-y-3 p-4 sm:p-5 ${studioVisual.editorSurface}`} data-testid="px4-source-banner">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">{t("px4.context.eyebrow")}</p>
      <div className="flex gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
            data-testid="px4-source-image"
          />
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-500 sm:h-24 sm:w-24"
            data-testid="px4-source-no-image"
          >
            {t("px4.context.noImage")}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            {context.title || t("px4.context.untitled")}
          </h2>
          {context.description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">{context.description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a
          href={context.returnTarget}
          className="inline-flex min-h-[44px] items-center font-semibold text-[#006D52] underline-offset-2 hover:underline"
          data-testid="px4-return-homecheff"
        >
          {t("px4.context.returnListing")}
        </a>
        <Link
          href="/studio/experience"
          prefetch={false}
          className="inline-flex min-h-[44px] items-center text-zinc-600 underline-offset-2 hover:underline"
          data-testid="px4-cancel"
        >
          {t("px4.context.cancel")}
        </Link>
      </div>
    </section>
  );
}
