"use client";

import { useState } from "react";
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

function CharacterVoicePreviewButton({
  characterId,
  language,
}: {
  characterId: string;
  language: string;
}) {
  const t = useActiveTranslator();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const runPreview = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/studio/characters/${encodeURIComponent(characterId)}/voice-preview`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        }
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json && typeof json === "object" && "error" in json
            ? String((json as { error: unknown }).error)
            : `HTTP ${res.status}`
        );
      }
      const url =
        json && typeof json === "object" && "audioUrl" in json
          ? String((json as { audioUrl: unknown }).audioUrl)
          : "";
      if (!url) {
        throw new Error("No preview URL");
      }
      setPreviewUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.directorV2.voice.previewFailed"));
      setPreviewUrl(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void runPreview()}
        className="rounded-full border border-[#0067B1]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[#0067B1] disabled:opacity-50"
      >
        {busy ? t("button.loading") : t("studio.directorV2.voice.preview")}
      </button>
      {error ? <p className="mt-1 text-[10px] text-red-700">{error}</p> : null}
      {previewUrl ?
        <audio controls src={previewUrl} className="mt-2 h-8 w-full max-w-xs" />
      : null}
    </div>
  );
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
                  className={`rounded-lg border px-2 py-1 text-[10px] font-medium ${
                    locked
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700"
                  }`}
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
          {character.voiceEnabled ?
            <CharacterVoicePreviewButton
              characterId={character.id}
              language={character.voiceLanguage || "en"}
            />
          : null}
        </div>
      ))}
      <p className="text-xs text-zinc-500">{t("studio.directorV2.voice.editHint")}</p>
    </div>
  );
}
