"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConversionSurface } from "@/components/billing/conversion-surface";
import { useActiveTranslator } from "@/i18n/client";

const STORAGE_KEY = "hc-first-success-dismissed";

type Props = {
  creditsRemaining?: number;
};

type CelebrationPhase = "loading" | "hidden" | "visible";

export function FirstSuccessCelebration({ creditsRemaining }: Props) {
  const t = useActiveTranslator();
  const [phase, setPhase] = useState<CelebrationPhase>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        if (!cancelled) setPhase("hidden");
        return;
      }
      const res = await fetch("/api/me/onboarding", { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setPhase("hidden");
        return;
      }
      const data = (await res.json()) as {
        progress: { firstRenderCompleted: boolean; isComplete: boolean };
      };
      if (data.progress.firstRenderCompleted && !data.progress.isComplete) {
        setPhase("visible");
      } else {
        setPhase("hidden");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase !== "visible") return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setPhase("hidden");
  }

  return (
    <section
      className="rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-900/80 to-zinc-900 p-6 text-white shadow-xl"
      data-testid="first-success-celebration"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
        {t("firstSuccess.label" as never)}
      </p>
      <h2 className="mt-2 text-2xl font-bold">{t("firstSuccess.title" as never)}</h2>
      <p className="mt-2 text-sm text-white/80">{t("firstSuccess.body" as never)}</p>
      {creditsRemaining != null ?
        <p className="mt-3 text-sm font-semibold text-emerald-200">
          {t("firstSuccess.creditsRemaining" as never, { count: creditsRemaining } as never)}
        </p>
      : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/animate/instant"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
        >
          {t("firstSuccess.cta.motion" as never)}
        </Link>
        <Link
          href="/studio/assets"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
        >
          {t("firstSuccess.cta.library" as never)}
        </Link>
        <Link
          href="/studio/storyboards/new"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
        >
          {t("firstSuccess.cta.another" as never)}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="mt-4 text-xs text-white/50 underline"
      >
        {t("firstSuccess.dismiss" as never)}
      </button>
      <div className="mt-4">
        <ConversionSurface pageType="motion" variant="compact" source="first_success" />
      </div>
    </section>
  );
}
