"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioCharacterIdentityBuilder } from "@/components/studio/studio-character-identity-builder";
import { StudioWorkspaceCharacterVoiceInline } from "@/components/studio/studio-workspace-character-voice-inline";
import { useActiveTranslator } from "@/i18n/client";
import {
  characterIdentityFormFromCharacter,
  characterIdentityFormToPatch,
  resolveCharacterVoiceIdentityStatus,
  type CharacterIdentityFormValues,
} from "@/lib/studio-character-identity-fields";
import {
  buildCharacterIdentityAiSuggestion,
  hasCharacterIdentitySuggestion,
} from "@/lib/studio-character-identity-suggestion";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { updateStudioCharacterApi } from "@/lib/studio-characters-client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

type Props = {
  characters: StudioCharacterListItem[];
  worlds: StudioWorldProfileListItem[];
  storyboard?: StudioStoryboardDetail | null;
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  canModify: boolean;
  isAdmin?: boolean;
  storyLanguage?: string;
  storyVoiceProfile?: string | null;
  onCharacterUpdated: (character: StudioCharacterListItem) => void;
  initialCharacterId?: string | null;
};

export function StudioWorkspaceCharacterIdentityBuilder({
  characters,
  worlds,
  storyboard,
  locations = [],
  props = [],
  memory,
  canModify,
  isAdmin = false,
  storyLanguage = "en",
  storyVoiceProfile,
  onCharacterUpdated,
  initialCharacterId,
}: Props) {
  const t = useActiveTranslator();

  const [selectedId, setSelectedId] = useState<string | null>(
    initialCharacterId ?? characters[0]?.id ?? null
  );
  const [form, setForm] = useState<CharacterIdentityFormValues | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedId) ?? null,
    [characters, selectedId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selectedCharacter) {
        setForm(null);
        return;
      }
      setForm(characterIdentityFormFromCharacter(selectedCharacter));
      setSavedOk(false);
      setSaveError("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCharacter]);

  const aiSuggestion = useMemo(() => {
    if (!storyboard || !selectedCharacter) return null;
    return buildCharacterIdentityAiSuggestion({
      storyboard,
      character: selectedCharacter,
      characters,
      locations,
      props,
      worlds,
      memory,
    });
  }, [storyboard, selectedCharacter, characters, locations, props, worlds, memory]);

  const showSuggestion = useMemo(() => {
    if (!selectedCharacter || !aiSuggestion) return false;
    return hasCharacterIdentitySuggestion(selectedCharacter, aiSuggestion);
  }, [selectedCharacter, aiSuggestion]);

  const completenessScore = useMemo(() => {
    if (!selectedCharacter || !form) return 0;
    const patch = characterIdentityFormToPatch(form);
    const merged: StudioCharacterListItem = {
      ...selectedCharacter,
      name: patch.name ?? selectedCharacter.name,
      role: (patch.role as StudioCharacterListItem["role"]) ?? selectedCharacter.role,
      description: patch.description ?? selectedCharacter.description,
      personality: patch.personality ?? selectedCharacter.personality,
      appearanceMemory: patch.appearanceMemory ?? selectedCharacter.appearanceMemory,
      personalityMemory: patch.personalityMemory ?? selectedCharacter.personalityMemory,
      visualKeywords: patch.visualKeywords ?? selectedCharacter.visualKeywords,
      defaultClothing: patch.defaultClothing ?? selectedCharacter.defaultClothing,
      defaultAccessories: patch.defaultAccessories ?? selectedCharacter.defaultAccessories,
      continuityNotes: patch.continuityNotes ?? selectedCharacter.continuityNotes,
      worldProfileId:
        patch.worldProfileId !== undefined ?
          patch.worldProfileId
        : selectedCharacter.worldProfileId,
    };
    return identityCompleteness(toIdentitySpec(merged));
  }, [selectedCharacter, form]);

  const voiceStatus = selectedCharacter
    ? resolveCharacterVoiceIdentityStatus(selectedCharacter)
    : "none";

  const handleFormChange = useCallback((next: CharacterIdentityFormValues) => {
    setForm(next);
    setSavedOk(false);
  }, []);

  const handleSave = async () => {
    if (!selectedCharacter || !form || !canModify) return;
    setSaveBusy(true);
    setSaveError("");
    const res = await updateStudioCharacterApi(
      selectedCharacter.id,
      characterIdentityFormToPatch(form)
    );
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(t("studio.characterIdentity.saveFailed"));
      return;
    }
    onCharacterUpdated(res.data.character);
    setForm(characterIdentityFormFromCharacter(res.data.character));
    setSavedOk(true);
  };

  if (characters.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
        {t("studio.characterIdentity.noCharacters")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">
          {t("studio.characterIdentity.selectCharacter")}
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {selectedCharacter && form ?
        <>
          <StudioCharacterIdentityBuilder
            mode="workspace"
            form={form}
            onFormChange={handleFormChange}
            worlds={worlds}
            canModify={canModify}
            isAdmin={isAdmin}
            completenessScore={completenessScore}
            aiSuggestion={showSuggestion ? aiSuggestion : null}
            voiceStatus={voiceStatus}
            voiceSection={
              <StudioWorkspaceCharacterVoiceInline
                character={selectedCharacter}
                storyLanguage={storyLanguage}
                storyVoiceProfile={storyVoiceProfile}
                canModify={canModify}
                defaultExpanded
                onCharacterUpdated={(updated) => {
                  onCharacterUpdated(updated);
                }}
              />
            }
          />

          {saveError ?
            <p className="text-sm text-red-700">{saveError}</p>
          : null}
          {savedOk ?
            <p className="text-sm text-[#006D52]">{t("studio.characterIdentity.saved")}</p>
          : null}

          {canModify ?
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void handleSave()}
              className="w-full rounded-full bg-[#0067B1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saveBusy ?
                t("studio.characterIdentity.saving")
              : t("studio.characterIdentity.save")}
            </button>
          : null}
        </>
      : null}
    </div>
  );
}
