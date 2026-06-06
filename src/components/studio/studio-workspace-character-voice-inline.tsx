"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StudioCharacterVoiceCenter,
  characterVoiceStateFromDetail,
  type CharacterVoiceFormState,
} from "@/components/studio/studio-character-voice-center";
import { StudioCharacterVoiceHistoryPanel } from "@/components/studio/studio-character-voice-history-panel";
import { useActiveTranslator } from "@/i18n/client";
import { updateStudioCharacterApi } from "@/lib/studio-characters-client";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import type { StudioCharacterListItem } from "@/types/studio-api";

type Props = {
  character: StudioCharacterListItem;
  storyLanguage: string;
  storyVoiceProfile?: string | null;
  canModify: boolean;
  onCharacterUpdated: (character: StudioCharacterListItem) => void;
  defaultExpanded?: boolean;
};

function voiceFormToPatch(state: CharacterVoiceFormState) {
  return {
    voiceEnabled: state.voiceEnabled,
    voiceProvider: state.voiceProvider,
    voiceProfile: state.voiceProfile,
    voiceLanguage: state.voiceLanguage,
    voiceGender: state.voiceGender,
    voiceDescription: state.voiceDescription,
    voiceNotes: state.voiceNotes,
    voiceLock: state.voiceLock,
    voiceProfilesByLanguage: state.voiceProfilesByLanguage,
  };
}

export function StudioWorkspaceCharacterVoiceInline({
  character,
  storyLanguage,
  storyVoiceProfile,
  canModify,
  onCharacterUpdated,
  defaultExpanded = false,
}: Props) {
  const t = useActiveTranslator();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [voiceState, setVoiceState] = useState<CharacterVoiceFormState>(() =>
    characterVoiceStateFromDetail(character)
  );
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVoiceState(characterVoiceStateFromDetail(character));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [character]);

  const resolved = useMemo(
    () =>
      resolveCharacterVoiceIdentity({
        character: { ...character, ...voiceFormToPatch(voiceState) },
        language: storyLanguage,
        attemptedOverrideProfile: storyVoiceProfile,
      }),
    [character, voiceState, storyLanguage, storyVoiceProfile]
  );

  const currentVoiceLabel = useMemo(() => {
    if (!resolved.voiceEnabled) {
      return t("studio.voiceIdentity.noVoice");
    }
    return t(getVoiceProfilePreset(resolved.voiceProfile).labelKey as never);
  }, [resolved, t]);

  const sourceLabel = useMemo(() => {
    if (resolved.source === "locked_base") {
      return t("studio.voiceIdentity.sourceLocked");
    }
    if (resolved.source === "language_override") {
      return t("studio.voiceIdentity.sourceLanguage");
    }
    return t("studio.voiceIdentity.sourceCharacter");
  }, [resolved.source, t]);

  const handleSave = async () => {
    if (!canModify) {
      return;
    }
    setSaveBusy(true);
    setSaveError("");
    const res = await updateStudioCharacterApi(character.id, voiceFormToPatch(voiceState));
    setSaveBusy(false);
    if (!res.ok) {
      setSaveError(
        (res.data as { error?: string }).error ?? t("studio.workspace.assets.saveFailed")
      );
      return;
    }
    onCharacterUpdated(res.data.character);
    setHistoryRefresh((n) => n + 1);
  };

  const lastChanged = character.updatedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(character.updatedAt))
    : null;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          {character.referenceImageUrl ?
            <img
              src={character.referenceImageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">{character.name}</p>
            <p className="text-xs text-zinc-600">
              {t("studio.voiceIdentity.currentVoice")}: {currentVoiceLabel}
            </p>
            <p className="text-xs text-zinc-500">
              {t("studio.voiceIdentity.effectiveVoice")}: {currentVoiceLabel} · {sourceLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {voiceState.voiceLock ?
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              {t("studio.voiceCenter.lockedShort")}
            </span>
          : null}
          {lastChanged ?
            <span className="text-[10px] text-zinc-400">
              {t("studio.voiceIdentity.lastChanged", { date: lastChanged })}
            </span>
          : null}
          <span className="text-xs font-semibold text-[#0067B1]">
            {expanded ? t("studio.voiceIdentity.collapse") : t("studio.voiceIdentity.expandVoice")}
          </span>
        </div>
      </button>

      {expanded ?
        <div className="border-t border-zinc-100 px-3 pb-4">
          <StudioCharacterVoiceCenter
            characterId={character.id}
            characterName={character.name}
            value={voiceState}
            onChange={setVoiceState}
          />
          {canModify ?
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void handleSave()}
                className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saveBusy ? t("button.loading") : t("studio.voiceIdentity.saveVoice")}
              </button>
            </div>
          : null}
          {saveError ?
            <p className="mt-2 text-xs text-red-700">{saveError}</p>
          : null}
          <section className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.voiceIdentity.voiceHistory")}
            </h4>
            <div className="mt-2">
              <StudioCharacterVoiceHistoryPanel
                characterId={character.id}
                refreshKey={historyRefresh}
              />
            </div>
          </section>
        </div>
      : null}
    </article>
  );
}
