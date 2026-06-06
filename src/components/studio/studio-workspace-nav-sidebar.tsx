"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

export type StudioWorkspaceNavId =
  | "scenes"
  | "characters"
  | "locations"
  | "props"
  | "worlds"
  | "assets"
  | "versions";

type NavItem = {
  id: StudioWorkspaceNavId;
  labelKey: TranslationKey;
};

const NAV_ITEMS: NavItem[] = [
  { id: "scenes", labelKey: "studio.workspace.scenes" },
  { id: "characters", labelKey: "studio.feature.characters.title" },
  { id: "locations", labelKey: "studio.feature.locations.title" },
  { id: "props", labelKey: "studio.feature.props.title" },
  { id: "worlds", labelKey: "studio.feature.worlds.title" },
  { id: "assets", labelKey: "studio.feature.assets.title" },
  { id: "versions", labelKey: "studio.workspace.versions" },
];

type Props = {
  activeNav: StudioWorkspaceNavId;
  onNavChange: (id: StudioWorkspaceNavId) => void;
};

export function StudioWorkspaceNavSidebar({ activeNav, onNavChange }: Props) {
  const t = useActiveTranslator();

  return (
    <nav className="flex flex-col gap-0.5 border-b border-zinc-200 p-2 lg:border-b-0 lg:border-r">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavChange(item.id)}
          className={`min-h-11 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition lg:min-h-0 lg:py-2 lg:text-xs ${
            activeNav === item.id
              ? "bg-[#0067B1]/10 text-[#0067B1]"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          {t(item.labelKey)}
        </button>
      ))}
    </nav>
  );
}
