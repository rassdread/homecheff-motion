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

type Props = {
  open: boolean;
  initialTab: StudioWorkspaceNavId;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  storyboardId: string;
  onClose: () => void;
};

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
    return locations.map((l) => ({
      id: l.id,
      name: l.name,
      href: `/studio/locations/${l.id}`,
    }));
  }
  if (tab === "props") {
    return props.map((p) => ({
      id: p.id,
      name: p.name,
      href: `/studio/props/${p.id}`,
    }));
  }
  if (tab === "worlds") {
    return [{ id: "worlds", name: "Worlds library", href: "/studio/worlds" }];
  }
  if (tab === "assets") {
    return [{ id: "assets", name: "Asset registry", href: "/studio/assets" }];
  }
  if (tab === "versions") {
    return [
      {
        id: "production",
        name: "Production center",
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

export function StudioWorkspaceAssetsDrawer({
  open,
  initialTab,
  characters,
  locations,
  props,
  storyboardId,
  onClose,
}: Props) {
  const t = useActiveTranslator();

  if (!open || initialTab === "scenes") {
    return null;
  }

  const rows = rowsForTab(initialTab, characters, locations, props, storyboardId);
  const titleKey = TAB_LABEL[initialTab];

  return (
    <>
      <button
        type="button"
        aria-label={t("studio.mediaAsset.close")}
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={onClose}
      />
      <aside className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl lg:bottom-auto lg:left-0 lg:top-[120px] lg:max-h-[calc(100vh-140px)] lg:w-[320px] lg:rounded-r-2xl lg:rounded-tl-none">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">
            {titleKey ? t(titleKey) : initialTab}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            {t("studio.mediaAsset.close")}
          </button>
        </div>
        <ul className="overflow-y-auto p-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                prefetch={false}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-zinc-50"
                onClick={onClose}
              >
                <span className="font-medium text-zinc-900">{row.name}</span>
                {row.meta ?
                  <span className="text-[10px] text-zinc-500">{row.meta}</span>
                : null}
              </Link>
            </li>
          ))}
          {rows.length === 0 ?
            <li className="px-3 py-6 text-center text-xs text-zinc-500">
              {t("studio.workspace.assetsEmpty")}
            </li>
          : null}
        </ul>
        <div className="border-t border-zinc-100 px-4 py-3">
          <Link
            href={
              initialTab === "characters"
                ? "/studio/characters"
                : initialTab === "locations"
                  ? "/studio/locations"
                  : initialTab === "props"
                    ? "/studio/props"
                    : initialTab === "worlds"
                      ? "/studio/worlds"
                      : initialTab === "assets"
                        ? "/studio/assets"
                        : `/studio/storyboards/${storyboardId}/production`
            }
            className="text-xs font-semibold text-[#0067B1] hover:underline"
          >
            {t("studio.workspace.openFullLibrary")} →
          </Link>
        </div>
      </aside>
    </>
  );
}
