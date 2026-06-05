"use client";

import { useMemo } from "react";
import { buildAssetPlacementForSceneDetail } from "@/lib/studio-asset-placement-director";
import { StudioDirectorInfoButton } from "@/components/studio/director-v2/studio-director-info-button";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  allCharacters: StudioCharacterListItem[];
  canModify: boolean;
  onToggleCharacter: (characterId: string) => void;
};

function characterInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function StudioDirectorSectionCharacters({
  scene,
  allCharacters,
  canModify,
  onToggleCharacter,
}: Props) {
  const t = useActiveTranslator();
  const placement = useMemo(() => buildAssetPlacementForSceneDetail(scene), [scene]);
  const focusByCharacter = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of placement.characterPlacements) {
      const focus =
        row.scale === "HERO" || row.placementPriority >= 85
          ? "hero"
          : row.placementPriority >= 50
            ? "primary"
            : row.depth === "BACKGROUND"
              ? "background"
              : "supporting";
      map.set(row.characterId, focus);
    }
    return map;
  }, [placement]);

  if (allCharacters.length === 0) {
    return (
      <p className="text-sm text-zinc-600">{t("studio.storyboards.field.noCharacters")}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-500">{t("studio.directorV2.characters.hint")}</p>
        <StudioDirectorInfoButton infoKey="studio.directorV2.info.characters" />
      </div>
      <ul className="space-y-2">
        {allCharacters.map((character) => {
          const inScene = scene.characters.some((c) => c.id === character.id);
          const focus = focusByCharacter.get(character.id) ?? "supporting";
          return (
            <li
              key={character.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                inScene ? "border-[#006D52]/30 bg-[#006D52]/5" : "border-zinc-200 bg-zinc-50/50"
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={inScene}
                  disabled={!canModify}
                  onChange={() => onToggleCharacter(character.id)}
                />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700">
                  {characterInitial(character.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-900">
                    {character.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {character.role?.trim() || t("studio.directorV2.characters.roleFallback")}
                  </span>
                </span>
              </label>
              {inScene ?
                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-900">
                  {t(`studio.directorV2.characters.focus.${focus}` as TranslationKey)}
                </span>
              : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
