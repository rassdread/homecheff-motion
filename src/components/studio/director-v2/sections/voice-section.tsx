"use client";

import { useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { StudioSourceBadge } from "@/components/studio/studio-source-badge";
import { useActiveTranslator } from "@/i18n/client";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  allCharacters: StudioCharacterListItem[];
  storyLanguage: string;
  storyVoiceProfile?: string | null;
};

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
        {busy ? t("button.loading") : t("studio.voiceIdentity.voicePreview")}
      </button>
      {error ? <p className="mt-1 text-[10px] text-red-700">{error}</p> : null}
      {previewUrl ?
        <StudioAudioPreviewPlayer
          audioUrl={previewUrl}
          source="voice_character"
          variant="inline"
          className="mt-2"
        />
      : null}
    </div>
  );
}

export function StudioDirectorSectionVoice({
  scene,
  allCharacters,
  storyLanguage,
  storyVoiceProfile,
}: Props) {
  const t = useActiveTranslator();
  const sceneCharacters = scene.characters
    .map((link) => allCharacters.find((c) => c.id === link.id) ?? link)
    .filter((c): c is StudioCharacterListItem => Boolean(c));

  if (sceneCharacters.length === 0) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.directorV2.voice.noCharacters")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StudioSourceBadge kind="studio_source" />
      </div>
      {sceneCharacters.map((character) => {
        const identity = resolveCharacterVoiceIdentity({
          character,
          language: storyLanguage,
          attemptedOverrideProfile: storyVoiceProfile,
        });
        const voiceLabel =
          identity.voiceEnabled
            ? t(getVoiceProfilePreset(identity.voiceProfile).labelKey as never)
            : t("studio.voiceIdentity.noVoice");

        return (
          <div
            key={character.id}
            className="rounded-xl border border-zinc-200 bg-white p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">{character.name}</p>
              {identity.voiceLock ? <StudioSourceBadge kind="protected" /> : null}
            </div>
            <p className="mt-2 text-sm text-[#0067B1]">
              {character.name} → {voiceLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t("studio.voiceIdentity.effectiveVoice")}: {voiceLabel}
            </p>
            {character.voiceEnabled ?
              <CharacterVoicePreviewButton
                characterId={character.id}
                language={storyLanguage}
              />
            : null}
          </div>
        );
      })}
      <p className="text-xs text-zinc-500">{t("studio.directorV2.voice.editHint")}</p>
    </div>
  );
}
