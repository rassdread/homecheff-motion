"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { HomeCheffAssetPickerModal, type AssetPickerSelection } from "@/components/library/homecheff-asset-picker-modal";
import { StudioCharacterEntryCtas } from "@/components/studio/studio-character-entry-ctas";
import { StudioStoryCharacterCard } from "@/components/studio/studio-story-character-card";
import { useActiveTranslator } from "@/i18n/client";
import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import {
  attachCharacterToStoryboardScene,
  duplicateStudioCharacter,
} from "@/lib/studio-character-entry-actions";
import { deleteStudioCharacterApi, fetchStudioCharacters } from "@/lib/studio-characters-client";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";
import { useState } from "react";

type Props = {
  characters: StudioCharacterListItem[];
  canModify: boolean;
  storyboardId?: string;
  scene?: StudioSceneDetail;
  hcProject?: HomeCheffProjectPackage | null;
  onCharactersRefresh: () => void | Promise<void>;
  onToggleCharacter?: (characterId: string) => void;
  onSceneUpdated?: (scene: StudioSceneDetail) => void;
  onProjectChange?: (project: HomeCheffProjectPackage) => void;
  missingHint?: string;
  showSceneToggle?: boolean;
};

export function StudioCharactersEntryPanel({
  characters,
  canModify,
  storyboardId,
  scene,
  hcProject,
  onCharactersRefresh,
  onToggleCharacter,
  onSceneUpdated,
  onProjectChange,
  missingHint,
  showSceneToggle = false,
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [attachError, setAttachError] = useState("");

  const clusterContext = {
    storyboardId,
    projectId: hcProject?.id,
    projectTitle: hcProject?.title,
  };

  const openCreate = useCallback(() => {
    router.push(buildCharacterClusterHref("new", clusterContext));
  }, [clusterContext, router]);

  const openFromReference = useCallback(
    (options?: { characterId?: string; mode?: "exact" | "custom_variant" }) => {
      router.push(
        buildCharacterClusterHref("from-reference", {
          ...clusterContext,
          characterId: options?.characterId,
          mode: options?.mode,
        })
      );
    },
    [clusterContext, router]
  );

  const openMotionReady = useCallback(() => {
    router.push(buildCharacterClusterHref("motion-ready", clusterContext));
  }, [clusterContext, router]);

  const handleLibraryPick = (selection: AssetPickerSelection) => {
    setPickerOpen(false);
    void (async () => {
      await onCharactersRefresh();
      if (storyboardId && scene && selection.id && onToggleCharacter) {
        onToggleCharacter(selection.id);
      }
      if (hcProject && onProjectChange && selection.url) {
        const ref = createHcAssetReference({
          id: `lib_char_${selection.id}`,
          url: selection.url,
          kind: "character",
          role: selection.name,
          sourceService: "studio",
        });
        onProjectChange(upsertHcAssetReference(hcProject, ref));
      }
    })();
  };

  const handleDuplicate = async (characterId: string) => {
    setBusyId(characterId);
    const res = await duplicateStudioCharacter(characterId);
    setBusyId(null);
    if (res.ok) {
      await onCharactersRefresh();
      if (onToggleCharacter) {
        onToggleCharacter(res.characterId);
      }
    }
  };

  const handleRemove = async (characterId: string) => {
    setBusyId(characterId);
    await deleteStudioCharacterApi(characterId);
    setBusyId(null);
    await onCharactersRefresh();
  };

  const showEmpty = characters.length === 0 || Boolean(missingHint);

  return (
    <div className="space-y-3" data-testid="studio-characters-entry-panel">
      {showEmpty ?
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-sm text-zinc-700">
            {missingHint ?? t("studio.v10_1.character.emptyLead" as never)}
          </p>
          {canModify ?
            <StudioCharacterEntryCtas
              onCreate={openCreate}
              onFromReference={() => openFromReference()}
              onLibrary={() => setPickerOpen(true)}
              onMotionReady={openMotionReady}
            />
          : null}
        </div>
      : null}

      {characters.length > 0 ?
        <ul className="space-y-2">
          {characters.map((character) => (
            <StudioStoryCharacterCard
              key={character.id}
              character={character}
              inScene={scene?.characters.some((c) => c.id === character.id)}
              canModify={canModify}
              onDuplicate={handleDuplicate}
              onVariant={(c) => openFromReference({ characterId: c.id, mode: "custom_variant" })}
              onRemove={handleRemove}
              onToggleScene={showSceneToggle ? onToggleCharacter : undefined}
              busyId={busyId}
            />
          ))}
        </ul>
      : null}

      {characters.length > 0 && canModify && !missingHint ?
        <StudioCharacterEntryCtas
          compact
          onCreate={openCreate}
          onFromReference={() => openFromReference()}
          onLibrary={() => setPickerOpen(true)}
          onMotionReady={openMotionReady}
        />
      : null}

      {attachError ?
        <p className="text-xs text-red-700">{attachError}</p>
      : null}

      <HomeCheffAssetPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleLibraryPick}
        initialCategory="characters"
      />
    </div>
  );
}
