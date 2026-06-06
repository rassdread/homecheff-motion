"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
} from "@/types/studio-api";
import type { StudioWorkspaceNavId } from "@/components/studio/studio-workspace-nav-sidebar";

type AssetRow = { id: string; name: string; href: string; meta?: string };

function rowsForTab(
  tab: StudioWorkspaceNavId,
  characters: StudioCharacterListItem[],
  locations: StudioLocationListItem[],
  props: StudioPropListItem[],
  storyboardId: string
): AssetRow[] {
  if (tab === "characters") {
    return characters.map((c) => ({
      id: c.id,
      name: c.name,
      href: `/studio/characters/${c.id}`,
      meta: c.role ?? undefined,
    }));
  }
  if (tab === "locations") {
    return locations.map((l) => ({ id: l.id, name: l.name, href: `/studio/locations/${l.id}` }));
  }
  if (tab === "props") {
    return props.map((p) => ({ id: p.id, name: p.name, href: `/studio/props/${p.id}` }));
  }
  if (tab === "worlds") {
    return [{ id: "worlds", name: "Worlds", href: "/studio/worlds" }];
  }
  if (tab === "assets") {
    return [{ id: "assets", name: "Assets", href: "/studio/assets" }];
  }
  if (tab === "versions") {
    return [
      {
        id: "production",
        name: "Production",
        href: `/studio/storyboards/${storyboardId}/production`,
      },
      {
        id: "movie-builder",
        name: "Movie builder",
        href: `/studio/storyboards/${storyboardId}/movie-builder`,
      },
    ];
  }
  return [];
}

const TAB_LABEL: Partial<Record<StudioWorkspaceNavId, TranslationKey>> = {
  characters: "studio.feature.characters.title",
  locations: "studio.feature.locations.title",
  props: "studio.feature.props.title",
  worlds: "studio.feature.worlds.title",
  assets: "studio.feature.assets.title",
  versions: "studio.workspace.versions",
};

type Props = {
  tab: StudioWorkspaceNavId;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  storyboardId: string;
  onNavigate?: () => void;
};

export function StudioWorkspaceAssetsList({
  tab,
  characters,
  locations,
  props,
  storyboardId,
  onNavigate,
}: Props) {
  const t = useActiveTranslator();
  const rows = rowsForTab(tab, characters, locations, props, storyboardId);
  const titleKey = TAB_LABEL[tab];

  return (
    <div className="flex h-full flex-col border-t border-zinc-100">
      <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {titleKey ? t(titleKey) : tab}
      </p>
      <ul className="flex-1 overflow-y-auto p-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={row.href}
              prefetch={false}
              onClick={onNavigate}
              className="flex items-center justify-between rounded-xl px-2 py-2 text-xs hover:bg-zinc-50"
            >
              <span className="font-medium text-zinc-900">{row.name}</span>
              {row.meta ?
                <span className="text-[10px] text-zinc-500">{row.meta}</span>
              : null}
            </Link>
          </li>
        ))}
        {rows.length === 0 ?
          <li className="px-2 py-4 text-center text-[10px] text-zinc-500">
            {t("studio.workspace.assetsEmpty")}
          </li>
        : null}
      </ul>
    </div>
  );
}
