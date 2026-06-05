"use client";

import { useActiveTranslator } from "@/i18n/client";
import { getVoiceProfilePreset, normalizeStudioVoiceProfileId } from "@/lib/studio-voice-profiles";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";
import type { VoiceIdentityLanguage } from "@/types/studio-voice-identity";

const DISPLAY_LANGUAGES: VoiceIdentityLanguage[] = ["nl", "en", "de", "fr", "es"];

type Props = {
  scene: StudioSceneDetail;
  allCharacters: StudioCharacterListItem[];
};

function resolveLanguageProfile(
  character: StudioCharacterListItem,
  language: VoiceIdentityLanguage
): { profile: string; locked: boolean } {
  const override = character.voiceProfilesByLanguage?.[language];
  if (override?.voiceProfile?.trim()) {
    return {
      profile: override.voiceProfile,
      locked: Boolean(character.voiceLock),
    };
  }
  return {
    profile: character.voiceProfile || "warm_narrator",
    locked: Boolean(character.voiceLock),
  };
}

export function StudioDirectorSectionVoice({ scene, allCharacters }: Props) {
  const t = useActiveTranslator();
  const sceneCharacters = scene.characters
    .map((link) => allCharacters.find((c) => c.id === link.id))
    .filter((c): c is StudioCharacterListItem => Boolean(c));

  if (sceneCharacters.length === 0) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.directorV2.voice.noCharacters")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {sceneCharacters.map((character) => (
        <div
          key={character.id}
          className="rounded-xl border border-zinc-200 bg-white p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">{character.name}</p>
            {character.voiceLock ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                {t("studio.directorV2.voice.locked")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {character.voiceEnabled
              ? t("studio.directorV2.voice.enabled")
              : t("studio.directorV2.voice.disabled")}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DISPLAY_LANGUAGES.map((lang) => {
              const { profile, locked } = resolveLanguageProfile(character, lang);
              const preset = getVoiceProfilePreset(normalizeStudioVoiceProfileId(profile));
              return (
                <span
                  key={lang}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-700"
                  title={locked ? t("studio.directorV2.voice.locked") : undefined}
                >
                  {lang.toUpperCase()}: {t(preset.labelKey as never)}
                </span>
              );
            })}
          </div>
          {character.voiceDescription ? (
            <p className="mt-2 text-xs text-zinc-600">{character.voiceDescription}</p>
          ) : null}
        </div>
      ))}
      <p className="text-xs text-zinc-500">{t("studio.directorV2.voice.editHint")}</p>
    </div>
  );
}
