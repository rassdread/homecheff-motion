"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";

const STORAGE_KEY = "hc-motion-onboarding-dismissed";

const STEPS = [
  { key: "step1" as const, href: "/studio/storyboards/new" },
  { key: "step2" as const, href: "/studio/storyboards" },
  { key: "step3" as const, href: "/animate/instant" },
  { key: "step4" as const, href: "/videos" },
] as const;

export function MotionStudioOnboarding() {
  const t = useActiveTranslator();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(STORAGE_KEY) !== "1";
  });

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <aside className="mx-4 mb-4 rounded-2xl border border-[#0067B1]/25 bg-gradient-to-r from-[#0067B1]/10 to-[#006D52]/10 p-4 shadow-sm lg:mx-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0067B1]">
            {t("studio.aiAssistant.onboarding.label")}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {t("studio.aiAssistant.onboarding.title")}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-9 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600"
        >
          {t("studio.aiAssistant.onboarding.dismiss")}
        </button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.key}>
            <Link
              href={step.href}
              prefetch={false}
              className="flex min-h-11 items-start gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs hover:border-[#006D52]/30"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#006D52] text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5 font-medium text-zinc-800">
                {t(`studio.aiAssistant.onboarding.${step.key}`)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
