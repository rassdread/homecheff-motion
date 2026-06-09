"use client";

import { UNIVERSE_QUICK_ACTIONS } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";

type UniverseQuickActionsProps = {
  hrefs: Record<string, string>;
  onNavigate: (href: string) => void;
};

export function UniverseQuickActions({ hrefs, onNavigate }: UniverseQuickActionsProps) {
  const t = useActiveTranslator();

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 px-4 sm:gap-3"
      role="navigation"
      aria-label={t("universe.quick.navLabel")}
    >
      {UNIVERSE_QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onNavigate(hrefs[action.id] ?? action.href)}
          className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium text-white/90 shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:px-5 sm:text-sm"
        >
          {t(action.labelKey)}
        </button>
      ))}
    </div>
  );
}
