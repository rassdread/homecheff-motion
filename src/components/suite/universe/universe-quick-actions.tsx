"use client";

import { UNIVERSE_QUICK_ACTIONS } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";

type UniverseQuickActionsProps = {
  hrefs: Record<string, string>;
  onNavigate: (href: string) => void;
};

const POD_ICONS: Record<string, string> = {
  createCharacter: "◆",
  createStory: "▣",
  animateImages: "▶",
  publishVideo: "◎",
  openLibrary: "☰",
};

export function UniverseQuickActions({ hrefs, onNavigate }: UniverseQuickActionsProps) {
  const t = useActiveTranslator();

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-wrap items-stretch justify-center gap-3 px-4"
      role="navigation"
      aria-label={t("universe.quick.navLabel")}
    >
      {UNIVERSE_QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onNavigate(hrefs[action.id] ?? action.href)}
          className="universe-glass-pod group flex min-w-[9rem] flex-1 flex-col items-center gap-2 rounded-2xl px-4 py-3 transition duration-300 hover:scale-[1.03] hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:min-w-[10rem] sm:px-5 sm:py-4"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm text-white/90 transition group-hover:bg-white/18"
            aria-hidden
          >
            {POD_ICONS[action.id]}
          </span>
          <span className="text-center text-xs font-semibold text-white/90 sm:text-sm">
            {t(action.labelKey)}
          </span>
        </button>
      ))}
    </div>
  );
}
