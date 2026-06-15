"use client";

import { StudioCharactersEntryPanel } from "@/components/studio/studio-characters-entry-panel";
import { StudioDirectorInfoButton } from "@/components/studio/director-v2/studio-director-info-button";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  allCharacters: StudioCharacterListItem[];
  canModify: boolean;
  storyboardId?: string;
  onToggleCharacter: (characterId: string) => void;
  onSceneUpdated?: (scene: StudioSceneDetail) => void;
  onCharactersRefresh?: () => void | Promise<void>;
};

export function StudioDirectorSectionCharacters({
  scene,
  allCharacters,
  canModify,
  storyboardId,
  onToggleCharacter,
  onSceneUpdated,
  onCharactersRefresh,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-500">{t("studio.directorV2.characters.hint")}</p>
        <StudioDirectorInfoButton infoKey="studio.directorV2.info.characters" />
      </div>
      <StudioCharactersEntryPanel
        characters={allCharacters}
        canModify={canModify}
        storyboardId={storyboardId}
        scene={scene}
        showSceneToggle
        onToggleCharacter={onToggleCharacter}
        onSceneUpdated={onSceneUpdated}
        onCharactersRefresh={onCharactersRefresh ?? (() => undefined)}
      />
    </div>
  );
}
